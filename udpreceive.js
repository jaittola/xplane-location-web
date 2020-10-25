const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const _ = require('lodash');

exports.onData = (handler) => { handlers.push(handler); }

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.bind(49008, () => {
    var address = server.address();
    console.log(`Listening to UDP at ${address.address}:${address.port}`);
});

server.on('message', processMessage)

var handlers = []

const DATA_MSG_LEN = 9 * 4;

const DATAHDR = "DATA";
const DREFHDR = 'DREF';
const RREFHDR = 'RREF';

let xplaneAddress = undefined;
let datarefTimer = undefined;

const datarefs = [
    { name: 'sim/aircraft/gear/acf_gear_retract',
      parse: parseBoolean,
      target: 'hasRetractingGear',
      length: 4,
    },
    { name: 'sim/cockpit2/annunciators/gear_unsafe',
      parse: parseBoolean,
      target: 'isGearUnsafe',
      length: 4,
    },
    { name: 'sim/cockpit2/controls/gear_handle_down',
      parse: parseBoolean,
      target: 'isGearHandleDown',
      length: 4,
    },
    { name: 'sim/cockpit2/controls/parking_brake_ratio',
      parse: parseParkingBrakeRatio,
      length: 4,
    }
];

const datarefIDs = _.chain(datarefs)
      .map((value, idx) => [value, idx])
      .keyBy(([value, idx]) => idx)
      .mapValues(([value, idx]) => value)
      .value();

function processMessage(msg, rinfo) {
    console.log(`server got: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
    xplaneAddress = {
        address: rinfo.address,
        port: rinfo.port,
    };
    const msgtype = msg.slice(0, DATAHDR.length).toString();
    switch (msgtype) {
    case DATAHDR:
        processDataMessage(msg.slice(5));
        break;
    case DREFHDR:
        console.log("Got dataref");
        console.log("Message content is ", msg.slice(5).toString());
        break;
    case RREFHDR:
        processRrefMessage(msg.slice(5));
        break;
    default:
        console.log("Unknown message, will skip. Type is", msgtype);
        console.log("Message content is ", msg.slice(5).toString());
        break;
                          }

    if (!datarefTimer) {
        requestDatarefs();
        datarefTimer = setInterval(requestDatarefs, 20000);
    }
}

function processDataMessage(buffer) {
    const msgCount = Math.floor(buffer.length / DATA_MSG_LEN);
    if (msgCount < 1) {
        return;
    }

    const messages = _.chain(msgCount)
        .range()
        .map((idx) => {
            const data = buffer.slice(idx * DATA_MSG_LEN,
                                      (idx + 1) * DATA_MSG_LEN);
            return {
                dataIndex: data.readInt32LE(0),
                dataFields: _.chain(_.range(8))
                    .map((idx) => { return data.readFloatLE((idx + 1) * 4); })
                    .value()
            };
        })
        .map((message) => {
            const handler = messageParsers[message.dataIndex]
            if (handler) {
                return handler(message);
            }
            return null;
        })
        .map((message) => { return _.omit(message, [ 'dataFields']); })
        .filter((message) => { return message != null; })
        .value();

    _.forEach(handlers, (handler) => {
        _.forEach(messages, (msg) => { handler(msg); });
    });

    console.log("Messages: " + JSON.stringify(messages, null, 2));
}

const messageParsers = {
    3: parseVelocities,
    14: parseGearAndBrakes,
    17: parsePitchRollHeadings,
    20: parseLatLonAltitude
};

function parseVelocities(message) {
    return _.assign(message, {
        kias: message.dataFields[0],
        ktas: message.dataFields[2],
        ktgs: message.dataFields[3],
        velocity: message.dataFields[0]
    });
}

function parseGearAndBrakes(message) {
    let gear;
    switch (message.dataFields[0]) {
    case 1:
        gear = 'Down';
        break;
    case 0:
        gear = 'Up';
        break;
    default:
        gear = 'Moving';
        break;
    }
    const parkingBrake = message.dataFields[1] == 0 ? 'Released' : 'Engaged';
    return _.assign(message, {
        gear: gear,
        'parking-brake': parkingBrake,
    });
}

function parsePitchRollHeadings(message) {
    return _.assign(message, {
        pitch: message.dataFields[0],
        roll: message.dataFields[1],
        heading: message.dataFields[3]
    });
}

function parseLatLonAltitude(message) {
    return _.assign(message, {
        lat: message.dataFields[0],
        lon: message.dataFields[1],
        altitude: message.dataFields[2]
    });
}

function parseBoolean(buffer, dataref) {
    const intVal = buffer.readInt32LE(0);
    return {
        [dataref.target]: !!intVal,
    }
}

function parseParkingBrakeRatio(buffer) {
    const ratio = buffer.readFloatLE(0);
    return {
        parkingBrakeRatio: ratio,
    };
}


function processRrefMessage(buffer) {
    let rest = buffer
    while (rest = processRref(rest)) { }
}

function processRref(buffer) {
    const datarefID = buffer.readInt32LE(0);
    const datarefDetails = datarefIDs[datarefID]
    if (datarefDetails) {
        const length = datarefDetails.length || 4;
        if (datarefDetails.parse) {
            const result = datarefDetails.parse(buffer.slice(4, 4 + length), datarefDetails)
            console.log("Got Dataref", datarefID, datarefDetails.name, result);
            handlers.forEach(handler => {
                handler(result);
            });
        } else {
            console.log("Got dataref", datarefID, datarefDetails ? datarefDetails.name : 'unknown',
                        "raw content", buffer.slice(4, 4 + length).toString('hex'));
        }
        return buffer.length > 4 + length ?
            buffer.slice(4 + length) : undefined;
    } else {
        console.log(`Got dataref with local ID ${datarefID} for which I have no handler`);
        // TODO, cancel this dataref.
        return undefined;
    }
}

function requestDatarefs() {
    if (!xplaneAddress) {
        return;
    }

    const messages = Object.entries(datarefIDs)
          .map(([key, value]) => {
              const msg = Buffer.alloc(413);
              msg.write(RREFHDR);
              msg.writeInt32LE(1, offset(0));
              msg.writeInt32LE(Number(key), offset(1));
              msg.write(value.name, offset(2));
              console.log(`Dataref request message: ${value.name} with key ${key}`);
              return msg;
          });

    function sendMessage(nth) {
        const msg = messages[nth];
        if (!msg) {
            return;
        }

        console.log(`Sending dataref request message ${msg.toString()}`);
        server.send(msg, 49000, xplaneAddress.address, (err) => {
            if (err) {
                console.log("Sending to XPlane failed", err);
                return;
            }
            setTimeout(() => { sendMessage(nth + 1) }, 20);
        });
    }

    sendMessage(0);
}

function offset(item) {
    const startOffset = 5;
    return startOffset + item * 4;
}
