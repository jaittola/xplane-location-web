import React from "react"
import { createRoot } from "react-dom/client"

console.log("Initializing React root")

const rootElement = document.getElementById("react-root")
const root = rootElement ? createRoot(rootElement!) : null
root?.render(
    <React.StrictMode>
        <div></div>
    </React.StrictMode>
)
