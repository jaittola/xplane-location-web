const _       = require('lodash');
const express = require("express");

const app  = express();
const http = require("http").Server(app);
const io   = require("socket.io")(http);

const isPi = require("detect-rpi");

const port = 3001;
/*
var mapsKey = process.env["GOOGLE_MAPS_KEY"];
if (!mapsKey) {
    console.log("GOOGLE_MAPS_KEY missing form environment. Cannot start.");
    process.exit(1);
}
*/

const udpreceive = require('./udpreceive');
udpreceive.onData((message) => { io.emit('data', message); });

if (isPi()) {
    const hwcontrols = require('./hwcontrols')
    hwcontrols.setup(udpreceive)

    process.once('SIGINT', () => {
        console.log("Caught SIGINT, exiting")
        process.exit(42)
    })
}

io.on('connection', function(socket) {
//    socket.emit('setup', { 'key': mapsKey });
    socket.on('message', (data) => {
        if (data.hasOwnProperty('command'))
            udpreceive.command(data);
        else if (data.hasOwnProperty('setDatarefValue'))
            udpreceive.setDatarefValue(data.setDatarefValue)
    });
});


app.use(express.static(__dirname + '/www')),

http.listen(port);
console.log(`Listening to HTTP on port ${port}`);
