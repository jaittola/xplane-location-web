import { CommandValue } from "../controls-definition"
import { FlightDataValues } from "../hooks/useFlightData"
import { sendSocket } from "../websocket"

export function ControlToggleButton(props: {
    incomingDataKey: string
    outgoingToggleCommand: CommandValue
    buttonText: string
    flightData: FlightDataValues
}) {
    const isOn = !!props.flightData[props.incomingDataKey]

    function handleClick() {
        sendSocket({ command: props.outgoingToggleCommand })
    }

    return (
        <div className="control-container">
            <button
                className={`control-toggle-button ${
                    isOn ? "control-toggle-button-down" : ""
                }`}
                onClick={handleClick}
            >
                {props.buttonText}
            </button>
        </div>
    )
}
