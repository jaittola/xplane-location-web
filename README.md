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
* Follow the instructions at
  <https://developers.google.com/maps/documentation/javascript/get-api-key?hl=en#key>
  to obtain a Google Maps API key.
* Add the Maps API key that you obtained from Google to your
  environment by running `export GOOGLE_MAPS_KEY="apikey"` (or
  equivalent, depending on your shell environment).
* Install [npm](https://www.npmjs.com/) for your platform. For Mac OS
  X, I recommend using [Homebrew](http://brew.sh/) for installing.
* To download the dependencies, run `npm install`
* To start the server, run `npm start`
* Point your browser to http://localhost:3001 (or to the IP address in
  which your are running the server).

## Configure X-Plane to position and speed data

In X-Plane 10,

1. Navigate to "Settings" -> "Data Input & Output"
  * Select the left-most check boxes for items 3 (speeds), 17
    (pitch, roll, hadings), and 20 (lat, lon, altitude). These
    selections cause your location, speed, and position data to be
    sent from X-Plane in UDP packets.
  * In the right-bottom corner of this view, set UDP date to 01.0 /
    s. You can use a larger rate if you want your position be updated
    more frequently. However, increasing the rate does not bring much
    benefit with slow general-aviation aircraft.
  * Close the settings view.

2. navigate to "Settings" -> "Net connections"
  * Select the "Data" tab.
  * Select the check box labelled "IP of data receiver (for Data Input
    & Output screen: Data-Set and Dataref-Out tabs)"
  * To the left of this check box, Set "IP for Data Output" to
    "127.0.0.1" (or to the address of the computer that runs the
    application) and the port number to 49008.

Now you're done! If everything has been set up correctly, the web
browser should start tracking the position of your simulated aircraft.

## License

Copyright © 2016 Jukka Aittola

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
