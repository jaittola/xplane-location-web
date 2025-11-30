import React from "react"
import { createRoot } from "react-dom/client"
import { DataPanel } from "./data-panel"

const viewType = document.location.pathname.includes("map.html")
    ? "map"
    : "controls"

const rootElement = document.getElementById("react-root")
const root = rootElement ? createRoot(rootElement!) : null
root?.render(
    <React.StrictMode>
        <div>
            <DataPanel viewType={viewType} />
        </div>
    </React.StrictMode>
)
