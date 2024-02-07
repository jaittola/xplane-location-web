;(function () {
    document.addEventListener("DOMContentLoaded", function (event) {
        setup()
    })

    var socket
    var map
    var marker
    var pathOnMap
    var previousPathPosition
    var latitude
    var longitude
    var bearing

    const currentDataValues = {}

    const commands = {
        toggleGear: "sim/flight_controls/landing_gear_toggle",
        toggleParkingBrake: "sim/flight_controls/brakes_toggle_max",
        toggleTaxiLights: "sim/lights/taxi_lights_toggle",
        toggleNavLights: "sim/lights/nav_lights_toggle",
        toggleStrobe: "sim/lights/strobe_lights_toggle",
        toggleBeacon: "sim/lights/beacon_lights_toggle",
        toggleLanding1: "sim/lights/landing_01_light_tog",
        toggleLanding2: "sim/lights/landing_02_light_tog",
        toggleLanding3: "sim/lights/landing_03_light_tog",
        toggleLanding4: "sim/lights/landing_04_light_tog",
        togglePitot0: "sim/ice/pitot_heat0_tog",
        togglePitot1: "sim/ice/pitot_heat1_tog",
        toggleStallWarnHeat: "sim/ice/AOA_heat0_tog",
        togglePropHeat: "sim/ice/prop_heat_tog",
        toggleWindowHeat: "sim/ice/window_heat_tog",
        servosOff: "sim/autopilot/servos_toggle",
        toggleFlightDirector: "sim/autopilot/fdir_toggle",
        setAutopilotHeadingMode: "sim/autopilot/heading",
        setAutopilotNavMode: "sim/autopilot/NAV",
        setAutopilotAltMode: "sim/autopilot/altitude_hold",
        setAutopilotApproachMode: "sim/autopilot/approach",
        setAutopilotBackCourseMode: "sim/autopilot/back_course",
        toggleYawDamper: "sim/systems/yaw_damper_toggle",
        noseUp: "sim/autopilot/nose_up_pitch_mode",
        noseDown: "sim/autopilot/nose_down_pitch_mode",
        headingUp: "sim/autopilot/heading_up",
        headingDown: "sim/autopilot/heading_down",
        headingSync: "sim/autopilot/heading_sync",
    }

    function setup() {
        const mapElement = document.getElementById("map")
        const variant = !!mapElement ? "map" : "controls"

        setupSocket()
        if (mapElement) setupMap()
        setupDataPanel(variant)
        setupControls()
        setupClearButton()
    }

    function setupSocket() {
        socket = io()

        socket.on("connect", function () {})

        socket.on("data", function (data) {
            handleData(data)
        })
    }

    function setupMap() {
        if (map) {
            return
        }

        map = L.map("map").setView(greenwich(), 13)
        L.tileLayer("https://c.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        }).addTo(map)
    }

    function greenwich() {
        return [51.47, 0.0]
    }

    function setupClearButton() {
        var clearButton = document.getElementById("clear-track")
        if (clearButton) {
            clearButton.addEventListener("click", clearTrackMarkers)
        }
    }

    function setupDataPanel(variant) {
        var main = document.getElementsByClassName("main")[0]

        if (!main) {
            alert("Cannot set up, main is missing")
            return
        }

        var panel = createDataPanel(variant)

        main.appendChild(panel)

        setupDataPanelMoveHandler(panel)
    }

    function createDataPanel(variant) {
        const panel = document.createElement("div")
        panel.className = "data-panel"

        const panelData = [
            { title: "Velocity", item: "velocity", unit: "kn" },
            { title: "Heading (M)", item: "heading", unit: "°" },
            { title: "Altitude", item: "altitude", unit: "ft" },
            { title: "Latitude", item: "lat", unit: "°" },
            { title: "Longitude", item: "lon", unit: "°" },
            { title: "Gear", item: "gear" },
            { title: "Parking brake", item: "parking-brake" },
        ]

        panelData
            .map(({ title, item, unit }) => {
                const element = document.createElement("div")
                element.className = "data"

                const titleElement = document.createElement("div")
                titleElement.className = "data-item"
                titleElement.textContent = title
                element.appendChild(titleElement)

                const valueElement = document.createElement("span")
                valueElement.className = "data-value"
                valueElement.id = `data-${item}`
                valueElement.textContent = " - "
                element.appendChild(valueElement)

                if (unit !== undefined) {
                    const unitElement = document.createElement("span")
                    unitElement.className = "data-unit"
                    unitElement.textContent = ` ${unit}`
                    element.appendChild(unitElement)
                }

                return element
            })
            .forEach((element) => {
                panel.appendChild(element)
            })

        const spacer = document.createElement("div")
        spacer.className = "spacer"
        panel.appendChild(spacer)

        switch (variant) {
            case "map":
                {
                    const buttonContainer = document.createElement("div")
                    buttonContainer.classList.add("data", "vertical-margin")

                    const clearTrack = document.createElement("button")
                    clearTrack.id = "clear-track"
                    clearTrack.textContent = "Clear track"
                    buttonContainer.appendChild(clearTrack)

                    panel.appendChild(buttonContainer)

                    const linkToControls = document.createElement("a")
                    linkToControls.setAttribute("href", "/")
                    linkToControls.textContent = "Show controls"
                    panel.appendChild(linkToControls)
                }
                break

            case "controls":
                {
                    const linkToMap = document.createElement("a")
                    linkToMap.setAttribute("href", "map.html")
                    linkToMap.textContent = "Show map"
                    panel.appendChild(linkToMap)
                }
                break
        }

        return panel
    }

    function setupDataPanelMoveHandler(panel) {
        panel.addEventListener("mousedown", function (event) {
            var rect = panel.getBoundingClientRect()
            var offsetX = event.clientX - rect.left
            var offsetY = event.clientY - rect.top

            panel.parentElement.addEventListener("mousemove", moveEventListener)
            panel.addEventListener("mouseup", upEventListener)

            function moveEventListener(event) {
                var nextX = event.clientX - offsetX
                var nextY = event.clientY - offsetY
                panel.style.left = nextX + "px"
                panel.style.top = nextY + "px"
                panel.style.right = undefined
                event.preventDefault()
            }

            function upEventListener(event) {
                panel.parentElement.removeEventListener(
                    "mousemove",
                    moveEventListener,
                )
                panel.removeEventListener("mouseup", upEventListener)
            }
        })
    }

    function clearTrackMarkers() {
        if (
            !pathOnMap ||
            latitude === undefined ||
            longitude === undefined ||
            bearing === undefined
        ) {
            return
        }

        pathOnMap.setLatLngs([L.latLng(latitude, longitude)])
    }

    function handleData(data) {
        _.forOwn(data, function (value, key) {
            if (
                !currentDataValues.hasOwnProperty(key) ||
                currentDataValues[key] !== value
            ) {
                const staticHandler = staticHandlers[key]
                if (staticHandler) {
                    console.log(`Calling handler for ${key} = ${value}`)
                    currentDataValues[key] = value
                    staticHandler(key, value)
                }
                handlers.forEach(({ dataKey, updateValue }) => {
                    if (dataKey === key) {
                        updateValue(value)
                    }
                })
            }
        })
        updatePositionMarker()
    }

    function updatePositionMarker() {
        if (
            !map ||
            latitude === undefined ||
            longitude === undefined ||
            bearing === undefined
        ) {
            return
        }

        var position = L.latLng(latitude, longitude)
        map.panTo(position)

        if (marker) {
            marker.setLatLng(position)
        } else {
            marker = L.marker(position, {
                icon: L.divIcon({
                    className: "position-marker",
                    iconSize: [20, 20],
                }),
                opacity: 0.8,
            }).addTo(map)
            pathOnMap = L.polyline([position], { color: "red" }).addTo(map)
            previousPathPosition = position
        }

        marker.setRotationAngle(Math.round(bearing))
        marker.setRotationOrigin("center")

        if (
            previousPathPosition &&
            previousPathPosition.distanceTo(position) > 200
        ) {
            pathOnMap.addLatLng(position)
            previousPathPosition = position
        }
    }

    function setupControls() {
        const controlsRoot = document.getElementById("controls")
        if (!controlsRoot) {
            return
        }

        document
            .getElementById("gear-handle")
            .addEventListener("click", () => sendCommand(commands.toggleGear))

        const toggleButtons = [
            {
                rowId: "controls-row-0",
                buttons: [
                    {
                        incomingDataKey: "parking-brake",
                        outgoingToggleCommand: commands.toggleParkingBrake,
                        buttonText: "Parking Brake",
                        isButtonPressed: (receivedValue) =>
                            receivedValue === "Engaged",
                    },
                ],
            },
            {
                rowId: "controls-row-1",
                buttons: [
                    {
                        incomingDataKey: "navigation-lights",
                        outgoingToggleCommand: commands.toggleNavLights,
                        buttonText: "Nav Lights",
                    },
                    {
                        incomingDataKey: "beacon",
                        outgoingToggleCommand: commands.toggleBeacon,
                        buttonText: "Beacon",
                    },
                    {
                        incomingDataKey: "strobe-lights",
                        outgoingToggleCommand: commands.toggleStrobe,
                        buttonText: "Strobe",
                    },
                    {
                        incomingDataKey: "taxi-lights",
                        outgoingToggleCommand: commands.toggleTaxiLights,
                        buttonText: "Taxi lights",
                    },
                    {
                        incomingDataKey: "landing-lights-1",
                        outgoingToggleCommand: commands.toggleLanding1,
                        buttonText: "Ldg Light",
                    },

                    {
                        incomingDataKey: "landing-lights-2",
                        outgoingToggleCommand: commands.toggleLanding2,
                        buttonText: "Ldg Light",
                    },
                    /* Baron has two landing lights. Remove these for now.
                       Useful for large aircraft like the B738.
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
                    */
                ],
            },
            {
                rowId: "controls-row-2",
                buttons: [
                    {
                        incomingDataKey: "pitot-heat-0",
                        outgoingToggleCommand: commands.togglePitot0,
                        buttonText: "Pitot Heat",
                    },
                    {
                        incomingDataKey: "pitot-heat-1",
                        outgoingToggleCommand: commands.togglePitot1,
                        buttonText: "Pitot Heat",
                    },
                    {
                        incomingDataKey: "stall-warn-heat",
                        outgoingToggleCommand: commands.toggleStallWarnHeat,
                        buttonText: "Stall Warn",
                    },
                    {
                        incomingDataKey: "prop-heat",
                        outgoingToggleCommand: commands.togglePropHeat,
                        buttonText: "Prop Heat",
                    },
                    {
                        incomingDataKey: "window-heat",
                        outgoingToggleCommand: commands.toggleWindowHeat,
                        buttonText: "Window Heat",
                    },
                ],
            },
            {
                rowId: "controls-row-3",
                buttons: [
                    {
                        incomingDataKey: "autopilot-engaged",
                        outgoingToggleCommand: commands.servosOff,
                        buttonText: "AP eng",
                    },
                    {
                        incomingDataKey: "flightdirector-engaged",
                        outgoingToggleCommand: commands.toggleFlightDirector,
                        buttonText: "Flight dir",
                    },
                    {
                        incomingDataKey: "autopilot-heading-mode",
                        outgoingToggleCommand: commands.setAutopilotHeadingMode,
                        buttonText: "AP HDG",
                    },
                    {
                        incomingDataKey: "autopilot-nav-mode",
                        outgoingToggleCommand: commands.setAutopilotNavMode,
                        buttonText: "AP NAV",
                    },
                    {
                        incomingDataKey: "autopilot-alt-mode",
                        outgoingToggleCommand: commands.setAutopilotAltMode,
                        buttonText: "AP ALT",
                    },
                    {
                        incomingDataKey: "autopilot-approach-mode",
                        outgoingToggleCommand:
                            commands.setAutopilotApproachMode,
                        buttonText: "AP APP",
                    },
                    {
                        incomingDataKey: "autopilot-back-course-mode",
                        outgoingToggleCommand:
                            commands.setAutopilotBackCourseMode,
                        buttonText: "AP BC",
                    },
                    {
                        incomingDataKey: "yaw-damper",
                        outgoingToggleCommand: commands.toggleYawDamper,
                        buttonText: "Yaw damper",
                    },
                    {
                        incomingDataKey: "",
                        outgoingToggleCommand: commands.noseUp,
                        buttonText: "Nose Up",
                    },
                    {
                        incomingDataKey: "",
                        outgoingToggleCommand: commands.noseDown,
                        buttonText: "Nose Down",
                    },
                ],
            },
            {
                rowId: "controls-row-4",
                buttons: [
                    {
                        incomingDataKey: "",
                        outgoingToggleCommand: commands.headingDown,
                        buttonText: "Heading -",
                    },
                    {
                        incomingDataKey: "",
                        outgoingToggleCommand: commands.headingUp,
                        buttonText: "Heading +",
                    },
                    {
                        incomingDataKey: "",
                        outgoingToggleCommand: commands.headingSync,
                        buttonText: "Heading sync",
                    },
                ],
            },
        ]

        toggleButtons.forEach(({ rowId, buttons }) =>
            buttons.forEach((button) => setupToggleButton(rowId, button)),
        )
    }

    var staticHandlers = {
        velocity: setNumericalData,
        "mag-heading": setMagneticHeading,
        altitude: setNumericalData,
        lat: setLatitude,
        lon: setLongitude,
        gear: setGear,
        hasRetractingGear: setHasRetractingGear,
        isGearUnsafe: setIsGearUnsafe,
        isGearHandleDown: setIsGearHandleDown,
        "parking-brake": setParkingBrake,
    }

    var handlers = []

    function setupToggleButton(containerId, buttonDetails) {
        const container = document.getElementById(containerId)
        if (!container) {
            console.log(`Requested container element ${containerId} not found`)
            return
        }
        const element = document.createElement("button")
        const buttonId =
            buttonDetails.buttonId || `${buttonDetails.incomingDataKey}-button`
        element.id = buttonId
        element.classList.add("control-toggle-button")
        element.append(document.createTextNode(buttonDetails.buttonText))
        element.addEventListener("click", () =>
            sendCommand(buttonDetails.outgoingToggleCommand),
        )
        handlers.push({
            dataKey: buttonDetails.incomingDataKey,
            updateValue: (value) =>
                setToggleButtonForElementId(
                    buttonId,
                    buttonDetails.isButtonPressed === undefined
                        ? value
                        : buttonDetails.isButtonPressed(value),
                ),
        })
        container.append(wrapIntoFrame(element))
    }

    function wrapIntoFrame(element) {
        const frame = document.createElement("div")
        frame.classList.add("control-container")
        frame.append(element)
        return frame
    }

    function setNumericalData(key, value) {
        var property = "data-" + key
        var element = document.getElementById(property)
        if (element) {
            var resultValue = " - "
            if (_.isNumber(value)) {
                resultValue = _.round(value, 1)
            }
            element.textContent = resultValue
        }
    }

    function setLatitude(key, value) {
        if (_.isNumber(value)) {
            latitude = value
        }
        setNumericalData(key, value)
    }

    function setLongitude(key, value) {
        if (_.isNumber(value)) {
            longitude = value
        }
        setNumericalData(key, value)
    }

    function setMagneticHeading(key, value) {
        if (_.isNumber(value)) {
            bearing = value
        }
        setNumericalData(key, value)
    }

    function setParkingBrake(key, value) {
        const textValue = value === "Engaged" ? "Engaged" : "Released"
        setText(key, textValue)
    }

    function setText(key, value) {
        const element = document.getElementById("data-" + key)
        if (element) {
            element.textContent = value
        }
    }

    function setGear(key, value) {
        setText(key, value)
        // TODO, the annunciator should look at gear deployment values.
        const element = document.getElementById(
            "gear-control-annunciator-down-and-locked",
        )
        addOrRemoveClass(element, value == "Down", "active-green")
    }

    function setHasRetractingGear(key, value) {
        const element = document.getElementById("gear-control-container")
        if (element) {
            element.style.display = value ? "flex" : "none"
        }
    }

    function setIsGearUnsafe(key, value) {
        const element = document.getElementById(
            "gear-control-annunciator-in-transit",
        )
        addOrRemoveClass(element, value, "active-red")
    }

    function setIsGearHandleDown(key, value) {
        setToggleButtonForElementId("gear-handle", value)
    }

    function setToggleButtonForElementId(elementId, value) {
        const element = document.getElementById(elementId)
        addOrRemoveClass(element, value, "control-toggle-button-down")
    }

    function sendCommand(command) {
        socket.send({ command: command })
    }

    function toggleValue(key) {
        if (!currentDataValues.hasOwnProperty(key)) {
            return
        }
        socket.send({
            setDatarefValue: {
                name: key,
                floatValue: currentDataValues[key] === true ? 0 : 1,
            },
        })
    }

    function addOrRemoveClass(element, shouldHaveClass, className) {
        if (!element) {
            return
        }
        if (shouldHaveClass) {
            element.classList.add(className)
        } else {
            element.classList.remove(className)
        }
    }
})()
