import Cookies from "js-cookie"
import _ from "lodash"
import * as L from "leaflet"
import "leaflet-rotatedmarker"

import {
    commands,
    ControlsButtonDefinition,
    toggleButtons,
} from "./controls-definition"
import { startWebsocket, sendSocket } from "./websocket"

type Variant = "map" | "controls"

type ReceivedDataSetter = (key: string, value: string | number) => void

type ToggleButtonHandler = {
    dataKey: string
    updateValue: (value: string | number) => void
}
;(function () {
    document.addEventListener("DOMContentLoaded", function () {
        setup()
    })

    let map: L.Map | undefined
    let marker: L.Marker<L.Icon<L.DivIconOptions>> | undefined
    let pathOnMap: L.Polyline | undefined
    let previousPathPosition: L.LatLng | undefined
    let latitude: number | undefined
    let longitude: number | undefined
    let bearing: number

    let isDraggingMap = false

    const currentDataValues: Record<string, string | number> = {}

    function setup() {
        const mapElement = document.getElementById("map")
        const variant = mapElement ? "map" : "controls"

        startWebsocket(handleData)
        if (mapElement) setupMap()
        setupDataPanel(variant)
        setupControls()
        setupClearButton()
        setupFollowButton()
    }

    function setupMap() {
        if (map) {
            return
        }

        map = L.map("map").setView(defaultLocation(), 13)
        L.tileLayer("https://c.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        }).addTo(map)
        map.on("dragstart", () => {
            isDraggingMap = true
        })
    }

    function defaultLocation(): L.LatLngTuple {
        const greenwich: L.LatLngTuple = [51.47, 0.0]

        try {
            const stored = Cookies.get("previousLocation")
            if (stored) {
                const storedObj = JSON.parse(stored)
                if (
                    storedObj.lat !== undefined &&
                    storedObj.lon !== undefined
                ) {
                    return [storedObj.lat, storedObj.lon]
                }
            }
        } catch (e) {
            console.log("Getting previous location cookie failed", e)
        }

        return greenwich
    }

    function setupClearButton() {
        const clearButton = document.getElementById("clear-track")
        if (clearButton) {
            clearButton.addEventListener("click", clearTrackMarkers)
        }
    }

    function setupFollowButton() {
        const followButton = document.getElementById("follow-button")
        if (followButton) {
            followButton.addEventListener("click", followAircraft)
        }
    }

    function setupDataPanel(variant: Variant) {
        const main = document.getElementsByClassName("main")[0]

        if (!main) {
            alert("Cannot set up, main is missing")
            return
        }

        const panel = createDataPanel(variant)

        main.appendChild(panel)

        setupDataPanelMoveHandler(panel)
    }

    function createDataPanel(variant: Variant) {
        const panel = document.createElement("div")
        panel.className = "data-panel"

        const panelData = [
            { title: "Velocity (IAS)", item: "ias", unit: "kn" },
            { title: "Velocity (TAS)", item: "tas", unit: "kn" },
            { title: "Heading (M)", item: "mag-heading", unit: "°" },
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
                    buttonContainer.classList.add(
                        "data",
                        "vertical-margin",
                        "flex-column",
                    )

                    const clearTrack = document.createElement("button")
                    clearTrack.id = "clear-track"
                    clearTrack.textContent = "Clear track"
                    buttonContainer.appendChild(clearTrack)

                    const follow = document.createElement("button")
                    follow.id = "follow-button"
                    follow.textContent = "Follow aircraft"
                    buttonContainer.appendChild(follow)

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

    function setupDataPanelMoveHandler(panel: HTMLDivElement) {
        panel.addEventListener("mousedown", function (event) {
            const rect = panel.getBoundingClientRect()
            const offsetX = event.clientX - rect.left
            const offsetY = event.clientY - rect.top

            panel.parentElement?.addEventListener(
                "mousemove",
                moveEventListener,
            )
            window.addEventListener("mouseup", upEventListener)

            function moveEventListener(event: MouseEvent) {
                const nextX = event.clientX - offsetX
                const nextY = event.clientY - offsetY
                panel.style.left = nextX + "px"
                panel.style.top = nextY + "px"
                panel.style.right = ""
                event.preventDefault()
            }

            function upEventListener() {
                panel.parentElement?.removeEventListener(
                    "mousemove",
                    moveEventListener,
                )
                window.removeEventListener("mouseup", upEventListener)
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

    function followAircraft() {
        isDraggingMap = false

        if (
            !map ||
            latitude === undefined ||
            longitude === undefined ||
            bearing === undefined
        ) {
            return
        }
    }

    function handleData(data: unknown) {
        _.forOwn(data, function (value, key) {
            if (
                // eslint-disable-next-line no-prototype-builtins
                !currentDataValues.hasOwnProperty(key) ||
                currentDataValues[key] !== value
            ) {
                const staticHandler = staticHandlers[key]
                if (staticHandler) {
                    // console.log(`Calling handler for ${key} = ${value}`)
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
        savePosition()
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

        const position = L.latLng(latitude, longitude)
        if (!isDraggingMap) {
            map.panTo(position)
        }

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
            pathOnMap?.addLatLng(position)
            previousPathPosition = position
        }
    }

    function savePosition() {
        if (latitude === undefined || longitude === undefined) {
            return
        }

        Cookies.set(
            "previousLocation",
            JSON.stringify({ lat: latitude, lon: longitude }),
        )
    }

    function setupControls() {
        const controlsRoot = document.getElementById("controls")
        if (!controlsRoot) {
            return
        }

        document
            ?.getElementById("gear-handle")
            ?.addEventListener("click", () => sendCommand(commands.toggleGear))

        toggleButtons.forEach(({ rowId, buttons }) =>
            buttons.forEach((button) => setupToggleButton(rowId, button)),
        )
    }

    const staticHandlers: Record<string, ReceivedDataSetter> = {
        ias: setNumericalData,
        tas: setNumericalData,
        "mag-heading": setMagneticHeading,
        altitude: setNumericalData,
        lat: setLatitude,
        lon: setLongitude,
        gear: setGear,
        "has-retracting-gear": setHasRetractingGear,
        "is-gear-unsafe": setIsGearUnsafe,
        "is-gear-handle-down": setIsGearHandleDown,
        "parking-brake": setParkingBrake,
    }

    const handlers: ToggleButtonHandler[] = []

    function setupToggleButton(
        containerId: string,
        buttonDetails: ControlsButtonDefinition,
    ) {
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
            updateValue: (value: string | number) =>
                setToggleButtonForElementId(buttonId, value),
        })
        container.append(wrapIntoFrame(element))
    }

    function wrapIntoFrame(element: HTMLElement) {
        const frame = document.createElement("div")
        frame.classList.add("control-container")
        frame.append(element)
        return frame
    }

    function setNumericalData(key: string, value: string | number) {
        const property = "data-" + key
        const element = document.getElementById(property)
        if (element) {
            let resultValue = " - "
            if (_.isNumber(value)) {
                resultValue = _.round(value, 1).toString()
            }
            element.textContent = resultValue
        }
    }

    function setLatitude(key: string, value: string | number) {
        if (_.isNumber(value)) {
            latitude = value
        }
        setNumericalData(key, value)
    }

    function setLongitude(key: string, value: string | number) {
        if (_.isNumber(value)) {
            longitude = value
        }
        setNumericalData(key, value)
    }

    function setMagneticHeading(key: string, value: string | number) {
        if (_.isNumber(value)) {
            bearing = value
        }
        setNumericalData(key, value)
    }

    function setParkingBrake(key: string, value: string | number | boolean) {
        const textValue = value == true ? "Engaged" : "Released"
        setText(key, textValue)
    }

    function setText(key: string, value: string | number) {
        const element = document.getElementById("data-" + key)
        if (element) {
            element.textContent = value.toString()
        }
    }

    function setGear(key: string, value: string | number) {
        setText(key, value)
        // TODO, the annunciator should look at gear deployment values.
        const element = document.getElementById(
            "gear-control-annunciator-down-and-locked",
        )
        addOrRemoveClass(element, value == "Down", "active-green")
    }

    function setHasRetractingGear(_key: string, value: string | number) {
        const element = document.getElementById("gear-control-container")
        if (element) {
            element.style.display = value ? "flex" : "none"
        }
    }

    function setIsGearUnsafe(key: string, value: string | number) {
        const element = document.getElementById(
            "gear-control-annunciator-in-transit",
        )
        addOrRemoveClass(element, !!value, "active-red")
    }

    function setIsGearHandleDown(key: string, value: string | number) {
        setToggleButtonForElementId("gear-handle", value)
    }

    function setToggleButtonForElementId(
        elementId: string,
        value: string | number,
    ) {
        const element = document.getElementById(elementId)
        addOrRemoveClass(element, !!value, "control-toggle-button-down")
    }

    function sendCommand(command: string) {
        sendSocket({ command })
    }

    function addOrRemoveClass(
        element: HTMLElement | null,
        shouldHaveClass: boolean,
        className: string,
    ) {
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
