import { useEffect, useState } from "react"
import { registerDataListener } from "../data-listeners"
import { LatLngTuple } from "leaflet"

export type FlightDataValueType = string | number | boolean
export type FlightDataValues = Record<string, FlightDataValueType>

export function useFlightData(): FlightDataValues {
    const [data, setData] = useState<FlightDataValues>({})

    useEffect(() => {
        const unsubscribe = registerDataListener((incomingData: unknown) => {
            if (incomingData && typeof incomingData === "object") {
                setData((prevData) => ({
                    ...prevData,
                    ...incomingData,
                }))
            }
        })

        return unsubscribe
    }, [])

    return data
}

export function position(
    flightData: FlightDataValues
): LatLngTuple | undefined {
    const lat = flightData["lat"]
    const lon = flightData["lon"]
    const markerPosition: LatLngTuple | undefined =
        typeof lat === "number" && typeof lon === "number"
            ? [lat, lon]
            : undefined
    return markerPosition
}
