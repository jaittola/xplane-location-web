import { commands } from "../controls-definition"
import { FlightDataValues } from "../hooks/use-flight-data"
import { sendSocket } from "../websocket"
import { AnnuniciatorContainer } from "./annunciator-container"
import { ToggleButton } from "./toggle-button"

type FlapsState = {
    positions: number
    currentPosition: number
    displayText: string
    state: "up" | "down" | "in-between" | "unknown"
}

export function FlapsControl({ flightData }: { flightData: FlightDataValues }) {
    const flapsState = useFlapsState(flightData)

    return (
        <div className="control-container">
            <ToggleButton
                isOn={
                    flapsState.state === "up" ||
                    flapsState.state === "in-between"
                }
                buttonText="Flaps Up"
                onClick={() => sendSocket({ command: commands.flapsUp })}
            />
            <FlapsValueDisplay flapsState={flapsState} />
            <ToggleButton
                isOn={
                    flapsState.state === "down" ||
                    flapsState.state === "in-between"
                }
                buttonText="Flaps Down"
                onClick={() => sendSocket({ command: commands.flapsDown })}
            />
        </div>
    )
}

function FlapsValueDisplay({ flapsState }: { flapsState: FlapsState }) {
    return (
        <AnnuniciatorContainer title="Flaps">
            <div className="control-annunciator-value">
                {flapsState.displayText}
            </div>
        </AnnuniciatorContainer>
    )
}

function useFlapsState(flightData: FlightDataValues): FlapsState {
    const positions =
        typeof flightData["flap-positions"] === "number"
            ? flightData["flap-positions"]
            : 0
    const currentPosition =
        typeof flightData["current-flap-position"] === "number"
            ? flightData["current-flap-position"]
            : 0

    let displayText = ""
    let state: FlapsState["state"] = "unknown"

    switch (true) {
        case positions === 0:
            displayText = "—"
            state = "unknown"
            break

        case currentPosition === 0:
            displayText = "Up"
            state = "up"
            break

        case currentPosition === positions:
            displayText = "Down"
            state = "down"
            break

        default:
            displayText = `${currentPosition}/${positions}`
            state = "in-between"
            break
    }

    return {
        positions,
        currentPosition,
        displayText,
        state,
    }
}
