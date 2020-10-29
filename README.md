## Introduction

This application is a simple moving map for the X-Plane flight
simulator. It shows the position, direction, speed, and track of your
simulated aircraft on Google Maps in a web browser.

![Screen shot](https://github.com/jaittola/xplane-location-web/raw/master/screenshots/browser-screenshot-2016-01-24.png)

This application consists of a small server that has been written in
Node.js. It receives data from X-Plane in UDP datagrams and re-formats
it into a simple format for the web browser. A web browser app
displays the data on a map.

## Installation

* Clone this repository using git.
* Install [npm](https://www.npmjs.com/) for your platform.
* To download the dependencies, run `npm install`
* If you are running on Windows, go to `www/components` and
  replace the symbolic links with copies of respective files from
  `../../node_modules/`. Setting up these files should be scripted.
* To start the server, run `npm start`
* Point your browser to http://localhost:3001 (or to the IP address in
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
        port number.  * Close the settings view.

Now you're done! If everything has been set up correctly, the web
browser should start tracking the position of your simulated aircraft.

## License

Copyright © 2016-2020 Jukka Aittola

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The map library, Leaflet, bears its own copyright. See https://github.com/Leaflet/Leaflet/blob/master/LICENSE for details.

The code rotates the location marker using the Leaflet RotatedMarker plugin. Its license is at https://github.com/bbecquet/Leaflet.RotatedMarker/blob/master/LICENSE .

Map data © OpenStreetMap contributors. See https://www.openstreetmap.org/copyright or https://www.opendatacommons.org/licenses/odbl .
