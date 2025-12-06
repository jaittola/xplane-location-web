import React from "react"
import { createRoot } from "react-dom/client"
import { DataPanel } from "./data-panel"
import { ControlButtons } from "./control-buttons"
import { FlightDataValues, useFlightData } from "../hooks/useFlightData"

const viewType = document.location.pathname.includes("map.html")
    ? "map"
    : "controls"

const rootElement = document.getElementById("react-root")
const root = rootElement ? createRoot(rootElement!) : null
root?.render(
    <React.StrictMode>
        <RootView />
    </React.StrictMode>
)

function RootView() {
    const flightData = useFlightData()

    return (
        <div>
            {viewType === "controls" ? (
                <ControlsView flightData={flightData} />
            ) : (
                <MapView flightData={flightData} />
            )}
        </div>
    )
}

function ControlsView({ flightData }: { flightData: FlightDataValues }) {
    return (
        <>
            <ControlButtons flightData={flightData} />
            <DataPanel viewType="controls" />
        </>
    )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MapView(_props: { flightData: FlightDataValues }) {
    return (
        <>
            <DataPanel viewType="map" />
        </>
    )
}
