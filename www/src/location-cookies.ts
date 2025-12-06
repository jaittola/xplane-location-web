import Cookies from "js-cookie"
import * as L from "leaflet"

const cookieName = "previousLocation"

export function defaultLocation(): L.LatLngTuple {
    const greenwich: L.LatLngTuple = [51.47, 0.0]

    try {
        const stored = Cookies.get(cookieName)
        if (stored) {
            const storedObj = JSON.parse(stored)
            if (storedObj.lat !== undefined && storedObj.lon !== undefined) {
                return [storedObj.lat, storedObj.lon]
            }
        }
    } catch (e) {
        console.log("Getting previous location cookie failed", e)
    }

    return greenwich
}

export function saveLocation([lat, lon]: L.LatLngTuple) {
    Cookies.set(cookieName, JSON.stringify({ lat, lon }))
}
