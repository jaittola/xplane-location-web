import { useEffect, useState } from "react"
import { registerDataListener } from "../data-listeners"

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
