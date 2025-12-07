import React, { useEffect, useRef, useState } from "react"
import { ViewType } from "../types"
import _ from "lodash"
import { FlightDataValues, FlightDataValueType } from "../hooks/use-flight-data"

type PanelPosition = {
    x: number
    y: number
}

const panelItems = [
    { label: "IAS", key: "ias", unit: "kn" },
    { label: "TAS", key: "tas", unit: "kn" },
    { label: "Heading", key: "mag-heading", unit: "°" },
    { label: "Altitude", key: "altitude", unit: "ft" },
    { label: "Latitude", key: "lat", unit: "°" },
    { label: "Longitude", key: "lon", unit: "°" },
    { label: "Gear", key: "is-gear-handle-down", formatter: formatGear },
    {
        label: "Parking Brake",
        key: "parking-brake",
        formatter: formatParkingBrake,
    },
]

export function DataPanel({
    viewType,
    flightData,
    showOtherView,
    clearTrack,
    followAircraft,
}: {
    viewType: ViewType
    flightData: FlightDataValues
    showOtherView: (viewType: ViewType) => void
    clearTrack?: () => void
    followAircraft?: () => void
}) {
    const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState<PanelPosition>({ x: 0, y: 0 })
    const panelRef = useRef<HTMLDivElement>(null)

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) return

        const rect = panelRef.current.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        })
        setIsDragging(true)
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return

        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("mouseup", handleMouseUp)

            return () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isDragging, dragOffset])

    const panelStyle: React.CSSProperties = {
        position: "fixed",
        left: position.x !== 0 ? `${position.x}px` : undefined,
        top: position.y !== 0 ? `${position.y}px` : undefined,
        right: position.x === 0 && position.y === 0 ? 0 : undefined,
        cursor: isDragging ? "grabbing" : "grab",
    }

    return (
        <div
            ref={panelRef}
            className="data-panel"
            style={panelStyle}
            onMouseDown={handleMouseDown}
        >
            {panelItems.map((item) => (
                <div key={item.key} className="data">
                    <div className="data-item">{item.label}</div>
                    <span className="data-value">
                        {formatValue(flightData[item.key], item.formatter)}
                    </span>
                    {item.unit && (
                        <span className="data-unit"> {item.unit}</span>
                    )}
                </div>
            ))}

            <div className="spacer" />
            {viewType === "controls" ? (
                <ControlsViewButtons showOtherView={showOtherView} />
            ) : (
                <MapViewButtons
                    showOtherView={showOtherView}
                    clearTrack={clearTrack}
                    followAircraft={followAircraft}
                />
            )}
        </div>
    )
}

function ControlsViewButtons({
    showOtherView,
}: {
    showOtherView: (viewType: ViewType) => void
}) {
    return (
        <div className="data vertical-margin flex-column">
            <button onClick={() => showOtherView("map")}>Show map</button>
        </div>
    )
}

function MapViewButtons({
    showOtherView,
    clearTrack,
    followAircraft,
}: {
    showOtherView: (viewType: ViewType) => void
    clearTrack?: () => void
    followAircraft?: () => void
}) {
    return (
        <div className="data vertical-margin flex-column">
            <button
                onClick={() => {
                    clearTrack?.()
                }}
            >
                Clear track
            </button>
            <button
                onClick={() => {
                    followAircraft?.()
                }}
            >
                Follow aircraft
            </button>
            <button onClick={() => showOtherView("controls")}>
                Show controls
            </button>
        </div>
    )
}

function formatValue(
    value: FlightDataValueType | undefined,
    formatter?: (value: FlightDataValueType | undefined) => string
): string {
    if (value === undefined) return "—"
    if (formatter) return formatter(value)
    if (_.isNumber(value)) return _.round(value, 1).toString()
    return String(value)
}

function formatParkingBrake(value: FlightDataValueType | undefined): string {
    return value ? "Engaged" : "Released"
}

function formatGear(value: FlightDataValueType | undefined): string {
    return value ? "Down" : "Up"
}
