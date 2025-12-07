import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { FlightDataValues, useFlightData } from "../hooks/use-flight-data"
import { ViewType } from "../types"
import { ControlButtons } from "./control-buttons"
import { DataPanel } from "./data-panel"
import { MapView } from "./map-view"
import { useFlightTrack } from "../hooks/use-flight-track"

const rootElement = document.getElementById("react-root")
const root = rootElement ? createRoot(rootElement!) : null
root?.render(
    <React.StrictMode>
        <RootView />
    </React.StrictMode>
)

function RootView() {
    const [viewType, setViewType] = useState<ViewType>("controls")
    const flightData = useFlightData()
    const flightTrack = useFlightTrack(flightData)

    return viewType === "controls" ? (
        <ControlsView
            flightData={flightData}
            showOtherView={(viewType) => setViewType(viewType)}
        />
    ) : (
        <MapView
            flightData={flightData}
            showOtherView={(viewType) => setViewType(viewType)}
            flightTrack={flightTrack}
        />
    )
}

function ControlsView({
    flightData,
    showOtherView,
}: {
    flightData: FlightDataValues
    showOtherView: (viewType: ViewType) => void
}) {
    return (
        <>
            <ControlButtons flightData={flightData} />
            <DataPanel
                viewType="controls"
                flightData={flightData}
                showOtherView={(viewType) => showOtherView(viewType)}
            />
        </>
    )
}
