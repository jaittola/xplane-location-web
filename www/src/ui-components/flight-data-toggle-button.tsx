import { CommandValue } from "../controls-definition"
import { FlightDataValues } from "../hooks/use-flight-data"
import { sendSocket } from "../websocket"
import { ToggleButton } from "./toggle-button"

export function FlightDataToggleButton(props: {
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
        <ToggleButton
            isOn={isOn}
            buttonText={props.buttonText}
            onClick={handleClick}
        />
    )
}
