(function() {
    document.addEventListener("DOMContentLoaded", function(event) {
        setup();
    });

    var socket;
    var map;
    var marker;
    var track = {
        previousPosition: greenwich(),
        markers: []
    };
    var latitude = 0;
    var longitude = 0;
    var bearing = 0.0;

    const currentDataValues = {};

    const commands = {
        toggleGear: 'sim/flight_controls/landing_gear_toggle',
        toggleParkingBrake: 'sim/flight_controls/brakes_toggle_max',
        toggleTaxiLights: 'sim/lights/taxi_lights_toggle',
        toggleNavLights: 'sim/lights/nav_lights_toggle',
        toggleStrobe: 'sim/lights/strobe_lights_toggle',
        toggleBeacon: 'sim/lights/beacon_lights_toggle',
        toggleLanding1: 'sim/lights/landing_01_light_tog',
        toggleLanding2: 'sim/lights/landing_02_light_tog',
        toggleLanding3: 'sim/lights/landing_03_light_tog',
        toggleLanding4: 'sim/lights/landing_04_light_tog',
        togglePitot0: 'sim/ice/pitot_heat0_tog',
        togglePitot1: 'sim/ice/pitot_heat1_tog',
        toggleStallWarnHeat: 'sim/ice/AOA_heat0_tog',
        togglePropHeat: 'sim/ice/prop_heat_tog',
        toggleWindowHeat: 'sim/ice/window_heat_tog',
    };

    function setup() {
        setupSocket();
        setupClearButton();
        setupDataPanel();
        setupControls();
    }

    function setupSocket() {
        socket = io();

        socket.on('connect', function() {
        });

        socket.on('data', function(data) {
            handleData(data);
        });

        socket.on('setup', function(data) {
            setupMap(data);
        });
    }

    function setupMap(data) {
        if (map) {
            return;
        }

        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "//maps.googleapis.com/maps/api/js?" +
            "v=3.22&" +
            "key=" + data.key +
            "&sensor=false" +
            "&libraries=visualization,geometry" +
            "&callback=loadMap";

        window.loadMap = loadMap;
        document.body.appendChild(script);
    }

    function loadMap() {
        map = new google.maps.Map(document.getElementById("map"),
                                  {
                                      zoom: 10,
                                      scaleControl: true,
                                      center: greenwich(),
                                      mapTypeId: google.maps.MapTypeId.HYBRID
                                  });
    }


    function greenwich() {
        return { lat: 51.47, lng: 0 };
    }

    function setupClearButton() {
        var clearButton = document
            .getElementById('clear-track');
        if (clearButton) {
            clearButton.addEventListener('click', clearTrackMarkers);
        }
    }

    function setupDataPanel() {
        var panel = document.getElementById('stats');

        panel.addEventListener('mousedown', function(event) {
            var rect = panel.getBoundingClientRect();
            var offsetX = event.clientX - rect.left;
            var offsetY = event.clientY - rect.top;

            panel.parentElement.addEventListener('mousemove', moveEventListener);
            panel.addEventListener('mouseup', upEventListener);

            function moveEventListener(event) {
                var nextX = event.clientX - offsetX;
                var nextY = event.clientY - offsetY;
                panel.style.left = nextX + "px";
                panel.style.top = nextY + "px";
                event.preventDefault();
            }

            function upEventListener(event) {
                panel.parentElement.removeEventListener('mousemove', moveEventListener);
                panel.removeEventListener('mouseup', upEventListener);
            }
        });

    }

    function clearTrackMarkers() {
        track.markers.forEach(function(marker) {
            marker.setMap(null);
        });
        track.markers = [];
    }

    function handleData(data) {
        _.forOwn(data, function(value, key) {
            const handler = handlers[key];
            if (handler &&
                (!currentDataValues.hasOwnProperty(key) || currentDataValues[key] !== value)) {
                console.log(`Calling handler for ${key} = ${value}`);
                currentDataValues[key] = value;
                handler(key, value);
            }
        });
        updatePositionMarker();
    }

    function updatePositionMarker() {
        if (!map) {
            return;
        }

        var position = {lat: latitude, lng: longitude};

        map.setCenter(position);

        if (!marker) {
            marker = new google.maps.Marker({
                position: position,
                map: map
            });
        }
        else {
            marker.setPosition(position);
        }
        marker.setIcon(makeDirectionSymbol(bearing));

        updatePath(position);
    }

    function makeDirectionSymbol(bearing) {
        return {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            rotation: Number(bearing),
            fillColor: "#ff0000",
            strokeColor: "#ff0000",
        };
    }

    function updatePath(currentPosition) {
        var p1 = new google.maps.LatLng(currentPosition);
        var p2 = new google.maps.LatLng(track.previousPosition);
        var distance = google.maps.geometry
            .spherical
            .computeDistanceBetween(p1, p2);
        if (distance > 30) {
            track.previousPosition = currentPosition;
            var marker = new google.maps.Marker({
                position: currentPosition,
                map: map,
                title: 'Path',
                icon: '/images/track-marker.png'
            });
            track.markers.push(marker);
        }
    }

    function setupControls() {
        const controlsRoot = document.getElementById('controls')
        if (!controlsRoot) {
            return
        }

        document.getElementById('gear-handle')
            .addEventListener('click', () => sendCommand(commands.toggleGear));
        document.getElementById('parking-brake-button')
            .addEventListener('click', () => sendCommand(commands.toggleParkingBrake));
        document.getElementById('taxi-lights-button')
            .addEventListener('click', () => sendCommand(commands.toggleTaxiLights));
        document.getElementById('navigation-lights-button')
            .addEventListener('click', () => sendCommand(commands.toggleNavLights));
        document.getElementById('beacon-button')
            .addEventListener('click', () => sendCommand(commands.toggleBeacon));
        document.getElementById('strobe-lights-button')
            .addEventListener('click', () => sendCommand(commands.toggleStrobe));
        document.getElementById('landing-lights-1-button')
            .addEventListener('click', () => sendCommand(commands.toggleLanding1));
        document.getElementById('landing-lights-2-button')
            .addEventListener('click', () => sendCommand(commands.toggleLanding2));
        document.getElementById('landing-lights-3-button')
            .addEventListener('click', () => sendCommand(commands.toggleLanding3));
        document.getElementById('landing-lights-4-button')
            .addEventListener('click', () => sendCommand(commands.toggleLanding4));
        document.getElementById('pitot-heat-0-button')
            .addEventListener('click', () => sendCommand(commands.togglePitot0));
        document.getElementById('pitot-heat-1-button')
            .addEventListener('click', () => sendCommand(commands.togglePitot1));
        document.getElementById('stall-warn-heat-button')
            .addEventListener('click', () => sendCommand(commands.toggleStallWarnHeat));
        document.getElementById('prop-heat-button')
            .addEventListener('click', () => sendCommand(commands.togglePropHeat));
        document.getElementById('window-heat-button')
            .addEventListener('click', () => sendCommand(commands.toggleWindowHeat));
    }

    var handlers = {
        'velocity': setNumericalData,
        'heading': setHeading,
        'altitude': setNumericalData,
        'lat': setLatitude,
        'lon': setLongitude,
        'gear': setGear,
        'parking-brake': setParkingBrake,
        'hasRetractingGear': setHasRetractingGear,
        'isGearUnsafe': setIsGearUnsafe,
        'isGearHandleDown': setIsGearHandleDown,
        'navigation-lights': setToggleButton,
        'beacon': setToggleButton,
        'strobe-lights': setToggleButton,
        'taxi-lights': setToggleButton,
        'landing-lights-1': setToggleButton,
        'landing-lights-2': setToggleButton,
        'landing-lights-3': setToggleButton,
        'landing-lights-4': setToggleButton,
        'pitot-heat-0': setToggleButton,
        'pitot-heat-1': setToggleButton,
        'stall-warn-heat': setToggleButton,
        'window-heat': setToggleButton,
        'prop-heat': setToggleButton,
    };

    function setNumericalData(key, value) {
        var property = "data-" + key;
        var element = document.getElementById(property);
        if (element) {
            var resultValue = " - "
            if (_.isNumber(value)) {
                resultValue = _.round(value, 1);
            }
            element.textContent = resultValue;
        }
    }

    function setLatitude(key, value) {
        if (_.isNumber(value)) {
            latitude = value;
        }
        setNumericalData(key, value);
    }

    function setLongitude(key, value) {
        if (_.isNumber(value)) {
            longitude = value;
        }
        setNumericalData(key, value);
    }

    function setHeading(key, value) {
        if (_.isNumber(value)) {
            bearing = value;
        }
        setNumericalData(key, value);
    }

    function setText(key, value) {
        const element = document.getElementById('data-' + key);
        if (element) {
            element.textContent = value;
        }
    }

    function setParkingBrake(key, value) {
        setText(key, value);
        const element = document.getElementById('parking-brake-button')
        addOrRemoveClass(element, value == 'Engaged', 'control-toggle-button-down');
    }

    function setGear(key, value) {
        setText(key, value);
        // TODO, the annunciator should look at gear deployment values.
        const element = document.getElementById('gear-control-annunciator-down-and-locked');
        addOrRemoveClass(element, value == 'Down', 'active-green');
    }

    function setHasRetractingGear(key, value) {
        const element = document.getElementById('gear-control-container');
        element.style.display = value ? 'flex' : 'none';
    }

    function setIsGearUnsafe(key, value) {
        const element = document.getElementById('gear-control-annunciator-in-transit');
        addOrRemoveClass(element, value, 'active-red');
    }

    function setIsGearHandleDown(key, value) {
        setToggleButtonForElementId('gear-handle', value);
    }

    function setToggleButton(key, value) {
        setToggleButtonForElementId(`${key}-button`, value);
    }

    function setToggleButtonForElementId(elementId, value) {
        const element = document.getElementById(elementId);
        addOrRemoveClass(element, value, 'control-toggle-button-down');
    }

    function sendCommand(command) {
        socket.send({ command: command });
    }

    function toggleValue(key) {
        if (!currentDataValues.hasOwnProperty(key)) {
            return;
        }
        socket.send({ setDatarefValue: { name: key,
                                         floatValue: currentDataValues[key] === true ? 0 : 1 }});
    }

    function addOrRemoveClass(element, shouldHaveClass, className) {
        if (shouldHaveClass) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
})();
