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
import { registerDataListener } from "./data-listeners"

type ReceivedDataSetter = (key: string, value: string | number) => void

type ToggleButtonHandler = {
    dataKey: string
    updateValue: (value: string | number) => void
}

/* TODO, remove after proper componentization */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let clearTrack: (() => void) | undefined
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let followAircraft: (() => void) | undefined

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

        registerDataListener(handleData)
        startWebsocket()
        if (mapElement) setupMap()
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
