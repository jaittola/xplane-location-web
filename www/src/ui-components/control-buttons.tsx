import { ControlDefinition, toggleButtons } from "../controls-definition"
import { FlightDataValues } from "../hooks/use-flight-data"
import { FlapsControl } from "./flaps-control"
import { FlightDataToggleButton } from "./flight-data-toggle-button"
import { GearControl } from "./gear-control"

export function ControlButtons({
    flightData,
}: {
    flightData: FlightDataValues
}) {
    return (
        <div className="controls">
            {toggleButtons.map((row, rowIndex) => (
                <div key={`controls-${rowIndex}`} className="controls-row">
                    {row.controls.map((control, colIndex) => (
                        <Control
                            key={`control-${rowIndex}-${colIndex}`}
                            control={control}
                            flightData={flightData}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

function Control({
    control,
    flightData,
}: {
    control: ControlDefinition
    flightData: FlightDataValues
}) {
    switch (control.type) {
        case "button":
            return (
                <FlightDataToggleButton
                    incomingDataKey={control.incomingDataKey}
                    outgoingToggleCommand={control.outgoingToggleCommand}
                    buttonText={control.text}
                    flightData={flightData}
                />
            )
        case "gear":
            return <GearControl flightData={flightData} />
        case "flaps":
            return <FlapsControl flightData={flightData} />
    }
}
