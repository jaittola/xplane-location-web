import { LatLngTuple } from "leaflet"
import { useState, useEffect } from "react"
import { FlightDataValues, position } from "./useFlightData"

export type FlightTracking = ReturnType<typeof useFlightTrack>

export function useFlightTrack(flightData: FlightDataValues) {
    const [track, setTrack] = useState<LatLngTuple[]>([])

    const markerPosition = position(flightData)

    useEffect(() => {
        if (markerPosition) {
            setTrack((prevTrack) => {
                if (
                    prevTrack.length &&
                    arePositionsEqual(
                        prevTrack[prevTrack.length - 1],
                        markerPosition
                    )
                ) {
                    return prevTrack
                }

                return [...prevTrack, markerPosition]
            })
        }
    }, [markerPosition])

    function clearTrack() {
        setTrack([])
    }

    return { track, clearTrack }
}

function arePositionsEqual(pos1: LatLngTuple, pos2: LatLngTuple) {
    return pos1[0] === pos2[0] && pos1[1] === pos2[1]
}
