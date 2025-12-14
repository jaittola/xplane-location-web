export function ToggleButton(props: {
    isOn: boolean
    buttonText: string
    onClick: () => void
}) {
    return (
        <div className="control-toggle-button">
            <button
                className={
                    props.isOn
                        ? "control-toggle-button-on"
                        : "control-toggle-button-off"
                }
                onClick={props.onClick}
            >
                {props.buttonText}
            </button>
        </div>
    )
}
