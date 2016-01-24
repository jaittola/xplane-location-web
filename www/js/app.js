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

    function setup() {
        socket = io();

        socket.on('connect', function() {
        });

        socket.on('data', function(data) {
            handleData(data);
        });

        socket.on('setup', function(data) {
            setupMap(data);
        });

        setupClearButton();
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
        document
            .getElementById('clear-track')
            .addEventListener('click', clearTrackMarkers);
    }

    function clearTrackMarkers() {
        track.markers.forEach(function(marker) {
            marker.setMap(null);
        });
        track.markers = [];
    }

    function handleData(data) {
        _.forOwn(data, function(value, key) {
            var handler = handlers[key];
            if (handler) {
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
        console.log("Calculated distance is " + distance + ", curr pos " + p1 + ", " + p2 + ", " + JSON.stringify(track.previousPosition));
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

    var handlers = {
        'velocity': setNumericalData,
        'heading': setHeading,
        'altitude': setNumericalData,
        'lat': setLatitude,
        'lon': setLongitude,
    };

    function setNumericalData(key, value) {
        var property = "data-" + key;
        var element = document.getElementById(property);
        if (element) {
            var resultValue = " - "
            if (_.isNumber(value)) {
                resultValue = _.round(value, 1);
            }
            element.innerHTML = resultValue;
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

})();
