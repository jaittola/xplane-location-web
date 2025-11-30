import { broadcastData } from "./data-listeners"

let socket: WebSocket | null = null
let reconnectTimer: number | null = null

export function startWebsocket() {
    function connect() {
        const ws = new WebSocket(`ws://${location.host}/websocket`)

        ws.addEventListener("open", () => {
            console.log("Websocket opened")
            socket = ws
        })

        ws.addEventListener("close", () => {
            console.log("Websocket closed")
            socket = null

            // schedule reconnect
            if (reconnectTimer) window.clearTimeout(reconnectTimer)
            reconnectTimer = window.setTimeout(connect, 2000)
        })

        ws.addEventListener("error", () => {
            console.log("Websocket failed")
            // a close event should follow; nothing else to do here
        })

        ws.addEventListener("message", (message: MessageEvent) => {
            try {
                const jsonm = JSON.parse(message.data as string)
                broadcastData(jsonm)
            } catch (error) {
                console.error("Got bad data from socket, skipping", error)
            }
        })
    }

    connect()
}

export function sendSocket(obj: unknown) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(obj))
        } catch (e) {
            console.warn("Failed to send over websocket", e)
        }
    } else {
        console.warn("WebSocket not open; dropping message", obj)
    }
}
