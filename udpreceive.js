const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const _ = require('lodash');

exports.onData = (handler) => { handlers.push(handler); }

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', processMessage)

server.on('listening', () => {
    var address = server.address();
    console.log(`Listening to UDP at ${address.address}:${address.port}`);
});

server.bind(49008)

var handlers = []

const DATAHDR = "DATA";
const DATA_MSG_LEN = 9 * 4;

function processMessage(msg, rinfo) {
    console.log(`server got: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
    if (msg.slice(0, DATAHDR.length).toString() != DATAHDR) {
        console.log("Unknown message, will skip");
        return
    }
    processDataMessage(msg.slice(5));
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
                    .map((idx) => { return data.readFloatLE(idx * 4); })
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
    17: parsePitchRollHeadings,
    20: parseLatLonAltitude
};

function parseVelocities(message) {
    return _.assign(message, {
        velocity: message.dataFields[1]
    });
}

function parsePitchRollHeadings(message) {
    return _.assign(message, {
        pitch: message.dataFields[1],
        roll: message.dataFields[2],
        heading: message.dataFields[4]
    });
}

function parseLatLonAltitude(message) {
    return _.assign(message, {
        lat: message.dataFields[1],
        lon: message.dataFields[2],
        altitude: message.dataFields[3]
    });
}
