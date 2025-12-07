import { CommandValue } from "../controls-definition"
import { FlightDataValues } from "../hooks/use-flight-data"
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
        <div className="control-toggle-button">
            <button
                className={
                    isOn
                        ? "control-toggle-button-on"
                        : "control-toggle-button-off"
                }
                onClick={handleClick}
            >
                {props.buttonText}
            </button>
        </div>
    )
}
