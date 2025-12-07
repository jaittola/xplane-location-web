import { commands } from "../controls-definition"
import { FlightDataValues, FlightDataValueType } from "../hooks/use-flight-data"
import { ControlToggleButton } from "./control-toggle-button"

export function GearControl({ flightData }: { flightData: FlightDataValues }) {
    return (
        flightData["has-retracting-gear"] && (
            <div className="control-container">
                <ControlToggleButton
                    incomingDataKey="is-gear-handle-down"
                    outgoingToggleCommand={commands.toggleGear}
                    buttonText={"Gear"}
                    flightData={flightData}
                />
                <GearInTransitAnnunciator
                    dataValue={flightData["is-gear-unsafe"]}
                />
                <GearDownAndLockedAnnunciator
                    isGearHandleDown={flightData["is-gear-handle-down"]}
                    isGearUnsafe={flightData["is-gear-unsafe"]}
                />
            </div>
        )
    )
}

function GearInTransitAnnunciator({
    dataValue,
}: {
    dataValue: FlightDataValueType | undefined
}) {
    const className = dataValue
        ? "control-annunciator-light active-red"
        : "control-annunciator-light inactive-red"
    return (
        <AnnuniciatorContainer title="In transit">
            <div className={className}></div>
        </AnnuniciatorContainer>
    )
}

function GearDownAndLockedAnnunciator({
    isGearHandleDown,
    isGearUnsafe,
}: {
    isGearHandleDown: FlightDataValueType | undefined
    isGearUnsafe: FlightDataValueType | undefined
}) {
    const className =
        isGearHandleDown && !isGearUnsafe
            ? "control-annunciator-light active-green"
            : "control-annunciator-light inactive-green"
    return (
        <AnnuniciatorContainer title="Down &amp; locked">
            <div className={className}></div>
        </AnnuniciatorContainer>
    )
}

function AnnuniciatorContainer({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="control-annunciator-container">
            <div className="control-annunciator-light-label">{title}</div>
            {children}
        </div>
    )
}
