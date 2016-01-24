(function() {
    document.addEventListener("DOMContentLoaded", function(event) {
        setup();
    });

    var socket;
    var map;
    var marker;
    var track = {
        previousPosition: { lat: 0.0, lng: 0.0 },
        markers: []
    };
    var latitude = 0;
    var longitude = 0;

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
                                      center: { lat: 51.47, lng: 0 },
                                      mapTypeId: google.maps.MapTypeId.HYBRID
                                  });
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

        if (!marker) {
            marker = new google.maps.Marker({
                position: position,
                map: map,
                title: 'Location'
            });
        }
        else {
            marker.setPosition(position);
        }

        map.setCenter(position);
        updatePath(position);
    }

    function updatePath(currentPosition) {
        var distance = google.maps.geometry
            .spherical
            .computeDistanceBetween(new google.maps.LatLng(currentPosition),
                                    new google.maps.LatLng(track.previousPosition));
        if (distance > 50) {
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
        'heading': setNumericalData,
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

})();
