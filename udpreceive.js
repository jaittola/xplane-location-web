const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const _ = require('lodash');

const { debug, err } = require('./logs')

exports.onData = (handler) => handlers.push(handler);
exports.command = (cmd) => performCommand(cmd);
exports.setDatarefValue = (datarefValue) => setDatarefValue(datarefValue);

server.on('error', (err) => {
    debug(`server error:\n${err.stack}`);
    server.close();
});

server.bind(49008, () => {
    var address = server.address();
    debug(`Listening to UDP at ${address.address}:${address.port}`);
});

server.on('message', processMessage)

let handlers = []

const DATA_MSG_LEN = 9 * 4;

const DATAHDR = "DATA";
const DREFHDR = 'DREF';
const RREFHDR = 'RREF';
const CMDHDR  = "CMND0";

let xplaneAddress = undefined;
let datarefTimer = undefined;

const datarefs = [
    {
        name: 'sim/aircraft/gear/acf_gear_retract',
        parse: parseBoolean,
        target: 'hasRetractingGear',
    },
    {
        name: 'sim/cockpit2/annunciators/gear_unsafe',
        parse: parseBoolean,
        target: 'isGearUnsafe',
    },
    {
        name: 'sim/cockpit2/controls/gear_handle_down',
        parse: parseBoolean,
        target: 'isGearHandleDown',
    },
    {
        name: 'sim/cockpit2/controls/parking_brake_ratio',
        parse: parseParkingBrakeRatio,
    },
    {
        name: 'sim/cockpit2/switches/avionics_power_on',
        parse: parseBoolean,
        target: 'avionics-master',
    },
    {
        name: 'sim/cockpit2/switches/navigation_lights_on',
        parse: parseBoolean,
        target: 'navigation-lights',
    },
    {
        name: 'sim/cockpit2/switches/beacon_on',
        parse: parseBoolean,
        target: 'beacon',
    },
    {
        name: 'sim/cockpit2/switches/strobe_lights_on',
        parse: parseBoolean,
        target: 'strobe-lights',
    },
    {
        name: 'sim/cockpit2/switches/taxi_light_on',
        parse: parseBoolean,
        target: 'taxi-lights',
    },
    {
        name: 'sim/cockpit2/switches/landing_lights_switch[0]',
        parse: parseBoolean,
        target: 'landing-lights-1',
    },
    {
        name: 'sim/cockpit2/switches/landing_lights_switch[1]',
        parse: parseBoolean,
        target: 'landing-lights-2'
    },
    {
        name: 'sim/cockpit2/switches/landing_lights_switch[2]',
        parse: parseBoolean,
        target: 'landing-lights-3',
    },
    {
        name: 'sim/cockpit2/switches/landing_lights_switch[3]',
        parse: parseBoolean,
        target: 'landing-lights-4'
    },
    {
        name: 'sim/cockpit2/switches/panel_brightness_ratio[0]',
        parse: parseBoolean,
        target: 'panel-lights-0'
    },
    {
        name: 'sim/cockpit2/switches/panel_brightness_ratio[1]',
        parse: parseBoolean,
        target: 'panel-lights-1'
    },
    {
        name: 'sim/cockpit2/switches/panel_brightness_ratio[2]',
        parse: parseBoolean,
        target: 'panel-lights-2'
    },
    {
        name: 'sim/cockpit2/switches/panel_brightness_ratio[3]',
        parse: parseBoolean,
        target: 'panel-lights-3'
    },
    {
        name: 'sim/aircraft/engine/acf_num_engines',
        parse: parseNumber,
        target: 'number-of-engines',
    },
    {
        name: 'sim/cockpit2/ice/ice_pitot_heat_on_pilot',
        parse: parseBoolean,
        target: 'pitot-heat-0',
    },
    {
        name: 'sim/cockpit2/ice/ice_pitot_heat_on_copilot',
        parse: parseBoolean,
        target: 'pitot-heat-1',
    },
    {
        name: 'sim/cockpit2/ice/ice_AOA_heat_on',
        parse: parseBoolean,
        target: 'stall-warn-heat',
    },
    {
        name: 'sim/cockpit2/ice/ice_prop_heat_on',
        parse: parseBoolean,
        target: 'prop-heat',
    },
    {
        name: 'sim/cockpit2/ice/ice_window_heat_on',
        parse: parseBoolean,
        target: 'window-heat',
    },
    {
        name: 'sim/cockpit2/autopilot/flight_director_mode',
        parse: parseAutopilotMode,
        target: 'autopilot-engaged',
    },
    {
        name: 'sim/cockpit2/autopilot/heading_mode',
        parse: parseBoolean,
        target: 'autopilot-heading-mode',
    },
    {
        name: 'sim/cockpit2/autopilot/altitude_hold_status',
        parse: parseBoolean,
        target: 'autopilot-alt-mode',
    },
    {
        name: 'sim/cockpit2/autopilot/glideslope_armed',
        parse: parseBoolean,
        target: 'autopilot-approach-mode',
    },
    {
        name: 'sim/cockpit2/autopilot/hnav_armed',
        parse: parseBoolean,
        target: 'autopilot-nav-mode',
    },
    {
        name: 'sim/cockpit2/autopilot/backcourse_on',
        parse: parseBoolean,
        target: 'autopilot-back-course-mode',
    },
    {
        name: 'sim/cockpit2/switches/yaw_damper_on',
        parse: parseBoolean,
        target: 'yaw-damper',
    },
    // sim/cockpit2/controls/flap_ratio
    // sim/cockpit2/annunciators/speedbrake*
];

const datarefsByID = _.chain(datarefs)
      .map((value, idx) => [value, idx])
      .keyBy(([value, idx]) => idx)
      .mapValues(([value, idx]) => value)
      .value();

const datarefsByTarget = _.keyBy(datarefs, (dr) => dr.target);

function processMessage(msg, rinfo) {
    debug(`server got: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
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
        debug("Got dataref");
        debug("Message content is ", msg.slice(5).toString());
        break;
    case RREFHDR:
        processRrefMessage(msg.slice(5));
        break;
    default:
        debug("Unknown message, will skip. Type is", msgtype);
        debug("Message content is ", msg.slice(5).toString());
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
                    .map((idx) => data.readFloatLE((idx + 1) * 4))
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
        .map((message) => _.omit(message, [ 'dataFields', 'dataIndex' ]))
        .filter((message) => message != null)
        .value();

    _.forEach(handlers, (handler) => {
        _.forEach(messages, handler);
    });

    debug("Messages: " + JSON.stringify(messages, null, 2));
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
    const numericVal = buffer.readFloatLE();
    return {
        [dataref.target]: !!numericVal,
    }
}

function parseNumber(buffer, dataref) {
    const numericVal = buffer.readFloatLE();
    return {
        [dataref.target]: numericVal,
    }
}

function parseParkingBrakeRatio(buffer) {
    const ratio = buffer.readFloatLE(0);
    return {
        parkingBrakeRatio: ratio,
    };
}

function parseAutopilotMode(buffer, dataref) {
    const ap = buffer.readFloatLE();
    return {
        [dataref.target]: ap == 2.0,
        'flightdirector-engaged': ap > 0,
    }
}

function processRrefMessage(buffer) {
    let rest = buffer
    while (rest = processRref(rest)) { }
}

function processRref(buffer) {
    const datarefID = buffer.readInt32LE(0);
    const datarefDetails = datarefsByID[datarefID]
    if (datarefDetails) {
        const length = datarefDetails.length || 4;
        if (datarefDetails.parse) {
            const result = datarefDetails.parse(buffer.slice(4, 4 + length), datarefDetails)
            debug("Got Dataref", datarefID, datarefDetails.name, result, buffer.toString('hex'));
            handlers.forEach(handler => {
                handler(result);
            });
        } else {
            debug("Got dataref", datarefID, datarefDetails ? datarefDetails.name : 'unknown',
                  "raw content", buffer.slice(4).toString('hex'));
        }
        return buffer.length > 4 + length ?
            buffer.slice(4 + length) : undefined;
    } else {
        debug(`Got dataref with local ID ${datarefID} for which I have no handler`);
        // TODO, cancel this dataref.
        return undefined;
    }
}

function requestDatarefs() {
    if (!xplaneAddress) {
        return;
    }

    const messages = Object.entries(datarefsByID)
          .map(([key, value]) => {
              const msg = Buffer.alloc(413);
              msg.write(RREFHDR);
              msg.writeInt32LE(1, offset(0));
              msg.writeInt32LE(Number(key), offset(1));
              msg.write(value.name, offset(2));
              debug(`Dataref request message: ${value.name} with key ${key}`);
              return msg;
          });

    function sendMessage(nth) {
        const msg = messages[nth];
        if (!msg) {
            return;
        }

        debug(`Sending dataref request message ${msg.toString()}`);
        sendToXPlane(msg, () => {
            setTimeout(() => {
                sendMessage(nth + 1)
            }, 20);
        });
    }

    sendMessage(0);
}

function offset(item) {
    const startOffset = 5;
    return startOffset + item * 4;
}

function performCommand(cmd) {
    const cmdValue = cmd.command;

    if (!cmdValue) {
        debug("No command at performCommand. Ignoring.");
        return;
    }

    const msg = Buffer.alloc(CMDHDR.length + cmdValue.length + 1);
    msg.write(CMDHDR);
    msg.write(cmdValue, CMDHDR.length);
    debug(`Sending command message to server ${msg.toString()}`);
    sendToXPlane(msg);
}

function setDatarefValue(datarefValue) {
    let datarefDataOffset = 5
    let datarefPathOffset = 0;
    const dataref = datarefsByTarget[datarefValue.name];
    if (!dataref) {
        return;
    }
    const msg = Buffer.alloc(509);
    msg.write(DREFHDR);
    if (datarefValue.hasOwnProperty('floatValue')) {
        datarefPathOffset = msg.writeFloatLE(datarefValue.floatValue, datarefDataOffset);
    }
    if (datarefPathOffset) {
        msg.write(dataref.name, datarefPathOffset);
        debug(`Sending set dataref to xplane: ${msg.toString()} ${msg.toString('hex')}`);
        sendToXPlane(msg);
    }
}

function sendToXPlane(buffer, onSuccess) {
    if (!xplaneAddress?.address) {
        err("XPlane address not defined. Won't send command to XPlane")
        return
    }

    server.send(buffer, 49000, xplaneAddress.address, (err) => {
        if (err) {
            debug("Sending to XPlane failed", err);
            return;
        }
        if (onSuccess) {
            onSuccess();
        }
    });
}
