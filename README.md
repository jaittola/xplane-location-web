## Introduction

This application provides some remote controls and
a simple moving map for the X-Plane flight simulator.

![Screen shot](https://github.com/jaittola/xplane-location-web/raw/master/screenshots/screenshot-1.png)
![Screen shot](https://github.com/jaittola/xplane-location-web/raw/master/screenshots/screenshot-2.png)

This application consists of a server written in rust.
It receives data from X-Plane in UDP datagrams and re-formats
it into a simple format for the web browser. A web browser app
displays the controls and the map.

The server, when run on a Raspberry Pi, can also handle input from rotary encoders and switches
that are connected to GPIO inputs. The support for hardware inputs is very much experimental.

This application will probably always be work in progress and mainly implemented for my
personal use.

### History of this project

The server was originally written with javascript for node.js, and the
frontend was implemented with simple client-side javascript.

The node.js server was replaced with a rather messy rust
implementation (it's my first rust project!) when the hardware inputs
were added. I switched to rust because handling the encoder inputs on
a Raspberry Pi with on node.js did not work reliably – node was just
too slow.

The frontend has recently (late 2025) been converted to Typescript &
React.

## Installation

* Clone this repository using git.
* Install [npm](https://www.npmjs.com/) for your platform.
* To download the dependencies, run `npm ci`
* Install [rust](https://rust-lang.org/) for your platform.
* Start the server using `npm run run-rust-server`
  * If you need more debug output from rust-server, set the loglevel: `npm run run-rust-server -- -- -l debug`
* Build the front-end code with `npm run build-web-prod`.
* Point your browser to http://localhost:3000 (or to the IP address in
  which your are running the server).

## Configure X-Plane to position and speed data

In X-Plane 11,

1. Navigate to "Settings" -> "Data Output" -> "General data output"
  * To get your location, speed, and position data to be
    sent from X-Plane in UDP packets, select the checkbox in the
    'Network via UDP' column for items
      * 3 (speeds),
      * 14 (gear and brakes),
      * 17 (pitch, roll, headings),
      * 20 (lat, lon, altitude)
  * In the "Output rates" section in the same view,
    set UDP date to 01.0 / s. You can use a larger rate if you want your
    position be updated more frequently. However, increasing the rate does
    not bring much benefit with slow general-aviation aircraft.
  * In the "Networ configuration" section,
      * Select the "Send network data output" click box
      * Set the IP address and port number to match the computer in which
        you want to run the data receiver application. For localhost,
        enter 127.0.0.1 to the IP address field, and use 49008 as the
        port number.
  * Close the settings view.

X-Plane sends UDP beacon messages when it is running. The Rust server
listens to these beacon messages and is able to auto-connect to
X-plane if it is running in the same network. Hence, the server should
work correctly even if the IP address has not been configured to
X-Plane.

Now you're done! If everything has been set up correctly, the web
browser should start tracking the position of your simulated aircraft,
and you should be able to control some electrical switches, too.

# Hardware inputs

Hardware inputs are available only on platforms that support Linux GPIO. I have tested them with a Raspberry PI.

`rust-server/hw-inputs` is a sample configuration file for the GPIO configuration (i.e., to which GPIO pins the rotary encoders and switches are connected).

To run the server with GPIO enabled, specify the GPIO configuration file on the command line: for example, `npm run run-rust-server -- -- -g hw-inputs.json`

Cross-compiling the rust server for Raspberry Pi is very simple. `rust-server/scripts/` contains scripts (that hopefully work) for setting up the cross-compiling environment and for cross-compiling the app.

## License

Copyright © 2016-2025 Jukka Aittola

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The map library, Leaflet, bears its own copyright. See https://github.com/Leaflet/Leaflet/blob/master/LICENSE for details.

The code rotates the location marker using the Leaflet RotatedMarker plugin. Its license is at https://github.com/bbecquet/Leaflet.RotatedMarker/blob/master/LICENSE .

Map data © OpenStreetMap contributors. See https://www.openstreetmap.org/copyright or https://www.opendatacommons.org/licenses/odbl .
