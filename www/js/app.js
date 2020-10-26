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

        document.getElementById('gear-handle').addEventListener('click', toggleGear);
        document.getElementById('parking-brake-button').addEventListener('click', toggleParkingBrake);
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
        addOrRemoveClass(element, value, 'default-hidden');
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

    function toggleGear() {
        socket.send({ command: 'sim/flight_controls/landing_gear_toggle' });
    }

    function toggleParkingBrake() {
        socket.send({ command: 'sim/flight_controls/brakes_toggle_max' });
    }

    function addOrRemoveClass(element, shouldHaveClass, className) {
        if (shouldHaveClass) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
})();
