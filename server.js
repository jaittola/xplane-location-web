const _       = require('lodash');
var express = require("express");

var app  = express();
var http = require("http").Server(app);
var io   = require("socket.io")(http);

var port = 3001;
/*
var mapsKey = process.env["GOOGLE_MAPS_KEY"];
if (!mapsKey) {
    console.log("GOOGLE_MAPS_KEY missing form environment. Cannot start.");
    process.exit(1);
}
*/

var udpreceive = require('./udpreceive');
udpreceive.onData((message) => { io.emit('data', message); });


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
