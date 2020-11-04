(function() {
    document.addEventListener("DOMContentLoaded", function(event) {
        setup();
    });

    var socket;
    var map;
    var marker;
    var pathOnMap;
    var previousPathPosition;
    var latitude;
    var longitude;
    var bearing;

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
        servosOff: 'sim/autopilot/servos_toggle',
        toggleFlightDirector: 'sim/autopilot/fdir_toggle',
        setAutopilotHeadingMode: 'sim/autopilot/heading',
        setAutopilotNavMode: 'sim/autopilot/NAV',
        setAutopilotAltMode: 'sim/autopilot/altitude_hold',
        setAutopilotApproachMode: 'sim/autopilot/approach',
        setAutopilotBackCourseMode: 'sim/autopilot/back_course',
        toggleYawDamper: 'sim/systems/yaw_damper_toggle',
        noseUp: 'sim/autopilot/nose_up_pitch_mode',
        noseDown: 'sim/autopilot/nose_down_pitch_mode',
    };

    function setup() {
        setupSocket();
        setupMap();
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
    }

    function setupMap(data) {
        if (!document.getElementById('map')) {
            return;
        }

        if (map) {
            return;
        }

        map = L.map('map').setView(greenwich(), 13);
        L.tileLayer('https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    {
                        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                    }).addTo(map);
    }


    function greenwich() {
        return [ 51.47, 0.0 ];
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
        if (!pathOnMap ||
            latitude === undefined ||
            longitude === undefined ||
            bearing === undefined) {
            return;
        }

        pathOnMap.setLatLngs([L.latLng(latitude, longitude)]);
    }

    function handleData(data) {
        _.forOwn(data, function(value, key) {
            if (!currentDataValues.hasOwnProperty(key) || currentDataValues[key] !== value) {
                const staticHandler = staticHandlers[key];
                if (staticHandler) {
                    console.log(`Calling handler for ${key} = ${value}`);
                    currentDataValues[key] = value;
                    staticHandler(key, value);
                }
                handlers.forEach(({ dataKey, updateValue }) => {
                    if (dataKey === key) {
                        updateValue(value);
                    }
                });
            }
        });
        updatePositionMarker();
    }

    function updatePositionMarker() {
        if (!map ||
            latitude === undefined ||
            longitude === undefined ||
            bearing === undefined) {
            return;
        }


        var position = L.latLng(latitude, longitude);
        map.panTo(position);

        if (marker) {
            marker.setLatLng(position);
        } else {
            marker = L.marker(position,
                              {
                                  icon: L.divIcon({className: 'position-marker',
                                                   iconSize: [20, 20]}),
                                  opacity: 0.8,
                              }).addTo(map);
            pathOnMap = L.polyline([position], { color: 'red' }).addTo(map);
            previousPathPosition = position;
        }

        marker.setRotationAngle(Math.round(bearing));
        marker.setRotationOrigin('center');

        if (previousPathPosition && previousPathPosition.distanceTo(position) > 200) {
            pathOnMap.addLatLng(position);
            previousPathPosition = position;
        }
    }

    function setupControls() {
        const controlsRoot = document.getElementById('controls')
        if (!controlsRoot) {
            return
        }

        document.getElementById('gear-handle')
            .addEventListener('click', () => sendCommand(commands.toggleGear));

        const toggleButtons = [
            {
                rowId: 'controls-row-0',
                buttons: [
                    {
                        incomingDataKey: 'parking-brake',
                        outgoingToggleCommand: commands.toggleParkingBrake,
                        buttonText: 'Parking Brake',
                        isButtonPressed: (receivedValue) => receivedValue === 'Engaged'
                  }
                ]
            },
            {
                rowId: 'controls-row-1',
                buttons: [
                    {
                        incomingDataKey: 'navigation-lights',
                        outgoingToggleCommand: commands.toggleNavLights,
                        buttonText: 'Nav Lights',
                    },
                    {
                        incomingDataKey: 'beacon',
                        outgoingToggleCommand: commands.toggleBeacon,
                        buttonText: 'Beacon',
                    },
                    {
                        incomingDataKey: 'strobe-lights',
                        outgoingToggleCommand: commands.toggleStrobe,
                        buttonText: 'Strobe',
                    },
                    {
                        incomingDataKey: 'taxi-lights',
                        outgoingToggleCommand: commands.toggleTaxiLights,
                        buttonText: 'Taxi lights',
                    },
                    {
                        incomingDataKey: 'landing-lights-1',
                        outgoingToggleCommand: commands.toggleLanding1,
                        buttonText: 'Ldg Light',
                    },

                    {
                        incomingDataKey: 'landing-lights-2',
                        outgoingToggleCommand: commands.toggleLanding2,
                        buttonText: 'Ldg Light',
                    },

                    {
                        incomingDataKey: 'landing-lights-3',
                        outgoingToggleCommand: commands.toggleLanding3,
                        buttonText: 'Ldg Light',
                    },

                    {
                        incomingDataKey: 'landing-lights-4',
                        outgoingToggleCommand: commands.toggleLanding4,
                        buttonText: 'Ldg Light',
                    },
                ]
            },
            {
                rowId: 'controls-row-2',
                buttons: [
                    {
                        incomingDataKey: 'pitot-heat-0',
                        outgoingToggleCommand: commands.togglePitot0,
                        buttonText: 'Pitot Heat',
                    },
                    {
                        incomingDataKey: 'pitot-heat-1',
                        outgoingToggleCommand: commands.togglePitot1,
                        buttonText: 'Pitot Heat',
                    },
                    {
                        incomingDataKey: 'stall-warn-heat',
                        outgoingToggleCommand: commands.toggleStallWarnHeat,
                        buttonText: 'Stall Warn',
                    },
                    {
                        incomingDataKey: 'prop-heat',
                        outgoingToggleCommand: commands.togglePropHeat,
                        buttonText: 'Prop Heat',
                    },
                    {
                        incomingDataKey: 'window-heat',
                        outgoingToggleCommand: commands.toggleWindowHeat,
                        buttonText: 'Window Heat',
                    },
                ],
            },
            {
                rowId: 'controls-row-3',
                buttons: [
                    {
                        incomingDataKey: 'autopilot-engaged',
                        outgoingToggleCommand: commands.servosOff,
                        buttonText: 'AP disco',
                    },
                    {
                        incomingDataKey: 'flightdirector-engaged',
                        outgoingToggleCommand: commands.toggleFlightDirector,
                        buttonText: 'Flight dir',
                    },
                    {
                        incomingDataKey: 'autopilot-heading-mode',
                        outgoingToggleCommand: commands.setAutopilotHeadingMode,
                        buttonText: 'AP HDG',
                    },
                    {
                        incomingDataKey: 'autopilot-nav-mode',
                        outgoingToggleCommand: commands.setAutopilotNavMode,
                        buttonText: 'AP NAV',
                    },
                    {
                        incomingDataKey: 'autopilot-alt-mode',
                        outgoingToggleCommand: commands.setAutopilotAltMode,
                        buttonText: 'AP ALT',
                    },
                    {
                        incomingDataKey: 'autopilot-approach-mode',
                        outgoingToggleCommand: commands.setAutopilotApproachMode,
                        buttonText: 'AP APP',
                    },
                    {
                        incomingDataKey: 'autopilot-back-course-mode',
                        outgoingToggleCommand: commands.setAutopilotBackCourseMode,
                        buttonText: 'AP BC',
                    },
                    {
                        incomingDataKey: 'yaw-damper',
                        outgoingToggleCommand: commands.toggleYawDamper,
                        buttonText: 'Yaw damper',
                    },
                    {
                        incomingDataKey: '',
                        outgoingToggleCommand: commands.noseUp,
                        buttonText: 'VS Down',
                    },
                    {
                        incomingDataKey: '',
                        outgoingToggleCommand: commands.noseDown,
                        buttonText: 'VS Down',
                    }

                ],
            },

        ];

        toggleButtons.forEach(({ rowId, buttons }) =>
                              buttons.forEach((button) => setupToggleButton(rowId,
                                                                            button)));
    }

    var staticHandlers = {
        'velocity': setNumericalData,
        'heading': setHeading,
        'altitude': setNumericalData,
        'lat': setLatitude,
        'lon': setLongitude,
        'gear': setGear,
        'hasRetractingGear': setHasRetractingGear,
        'isGearUnsafe': setIsGearUnsafe,
        'isGearHandleDown': setIsGearHandleDown,
    };

    var handlers = [];

    function setupToggleButton(containerId,
                               buttonDetails) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.log(`Requested container element ${containerId} not found`);
            return;
        }
        const element = document.createElement('button');
        const buttonId = buttonDetails.buttonId || `${buttonDetails.incomingDataKey}-button`;
        element.id = buttonId;
        element.classList.add('control-toggle-button');
        element.append(document.createTextNode(buttonDetails.buttonText));
        element.addEventListener('click', () => sendCommand(buttonDetails.outgoingToggleCommand));
        handlers.push({ dataKey: buttonDetails.incomingDataKey,
                        updateValue:
                        (value) => setToggleButtonForElementId(buttonId,
                                                               buttonDetails.isButtonPressed === undefined ?
                                                               value :
                                                               buttonDetails.isButtonPressed(value))
                      });
        container.append(wrapIntoFrame(element));
    }

    function wrapIntoFrame(element) {
        const frame = document.createElement('div');
        frame.classList.add('control-container');
        frame.append(element);
        return frame;
    }

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

    function setGear(key, value) {
        setText(key, value);
        // TODO, the annunciator should look at gear deployment values.
        const element = document.getElementById('gear-control-annunciator-down-and-locked');
        addOrRemoveClass(element, value == 'Down', 'active-green');
    }

    function setHasRetractingGear(key, value) {
        const element = document.getElementById('gear-control-container');
        if (element) {
            element.style.display = value ? 'flex' : 'none';
        }
    }

    function setIsGearUnsafe(key, value) {
        const element = document.getElementById('gear-control-annunciator-in-transit');
        addOrRemoveClass(element, value, 'active-red');
    }

    function setIsGearHandleDown(key, value) {
        setToggleButtonForElementId('gear-handle', value);
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
        if (!element) {
            return;
        }
        if (shouldHaveClass) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
})();
