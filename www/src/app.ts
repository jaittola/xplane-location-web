import { startWebsocket } from "./websocket"
;(function () {
    document.addEventListener("DOMContentLoaded", function () {
        setup()
    })

    // let pathOnMap: L.Polyline | undefined
    // let previousPathPosition: L.LatLng | undefined

    function setup() {
        startWebsocket()
    }
})()
