import { divIcon, LatLngTuple } from "leaflet"
import "leaflet-rotatedmarker"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet"
import { FlightDataValues } from "../hooks/useFlightData"
import { defaultLocation, saveLocation } from "../location-cookies"
import { ViewType } from "../types"
import { DataPanel } from "./data-panel"

export function MapView({
    flightData,
    showOtherView,
}: {
    flightData: FlightDataValues
    showOtherView: (viewType: ViewType) => void
}) {
    const lat = flightData["lat"]
    const lon = flightData["lon"]
    const markerPosition: LatLngTuple | undefined =
        typeof lat === "number" && typeof lon === "number"
            ? [lat, lon]
            : undefined
    const magHeading = flightData["mag-heading"]
    const bearing = typeof magHeading === "number" ? magHeading : 0

    const [isDraggingMap, setIsDraggingMap] = useState(false)

    // TODO, implement track & track clearing button

    // The typings seem to be a bit broken, hence the any.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerRef = useRef<any>(null)

    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setRotationAngle(bearing)
        }
    }, [bearing])

    return (
        <>
            <MapContainer
                className="map"
                center={defaultLocation()}
                zoom={13}
                scrollWheelZoom={true}
            >
                <MapEventHandler
                    markerPosition={markerPosition}
                    isDraggingMap={isDraggingMap}
                    setIsDraggingMap={setIsDraggingMap}
                />
                <TileLayer
                    url="https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
                />
                {markerPosition && (
                    <Marker
                        ref={markerRef}
                        position={markerPosition}
                        icon={divIcon({
                            className: "position-marker",
                            iconSize: [20, 20],
                        })}
                        rotationAngle={bearing}
                        rotationOrigin="center"
                    />
                )}
            </MapContainer>
            <DataPanel
                viewType="map"
                flightData={flightData}
                followAircraft={() => {
                    setIsDraggingMap(false)
                }}
                showOtherView={showOtherView}
            />
        </>
    )
}

function MapEventHandler({
    markerPosition,
    isDraggingMap,
    setIsDraggingMap,
}: {
    markerPosition: LatLngTuple | undefined
    isDraggingMap: boolean
    setIsDraggingMap: (isDragging: boolean) => void
}) {
    const map = useMapEvents({
        dragstart: () => {
            setIsDraggingMap(true)
        },
    })

    useEffect(() => {
        if (markerPosition) {
            saveLocation(markerPosition)
            if (!isDraggingMap) {
                map.setView(markerPosition)
            }
        }
    }, [markerPosition, isDraggingMap])

    return null
}
