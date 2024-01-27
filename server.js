const express = require('express');

const app  = express();
const http = require('http').Server(app);
const io   = require('socket.io')(http);

const isPi = require('detect-rpi');

const { err } = require('./logs')

const port = 3001;

const xplaneComms = require('./xplane-comms');
xplaneComms.onData((message) => {
  io.emit('data', message);
});

if (isPi()) {
    const hwcontrols = require('./hwcontrols')
    hwcontrols.setup(xplaneComms)

    process.once('SIGINT', () => {
        err("Caught SIGINT, exiting")
        process.exit(42)
    })
}

io.on('connection', function(socket) {
    socket.on('message', (data) => {
        if (data.hasOwnProperty('command'))
            xplaneComms.command(data);
        else if (data.hasOwnProperty('setDatarefValue'))
            xplaneComms.setDatarefValue(data.setDatarefValue)
    });
});


app.use(express.static(__dirname + '/www')),

http.listen(port);
err(`Listening to HTTP on port ${port}`);
