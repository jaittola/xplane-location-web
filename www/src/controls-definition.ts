export const commands = {
    toggleGear: "sim/flight_controls/landing_gear_toggle",
    toggleParkingBrake: "sim/flight_controls/brakes_toggle_max",
    toggleTaxiLights: "sim/lights/taxi_lights_toggle",
    toggleNavLights: "sim/lights/nav_lights_toggle",
    toggleStrobe: "sim/lights/strobe_lights_toggle",
    toggleBeacon: "sim/lights/beacon_lights_toggle",
    toggleLanding1: "sim/lights/landing_01_light_tog",
    toggleLanding2: "sim/lights/landing_02_light_tog",
    toggleLanding3: "sim/lights/landing_03_light_tog",
    toggleLanding4: "sim/lights/landing_04_light_tog",
    togglePitot0: "sim/ice/pitot_heat0_tog",
    togglePitot1: "sim/ice/pitot_heat1_tog",
    toggleStallWarnHeat: "sim/ice/AOA_heat0_tog",
    togglePropHeat: "sim/ice/prop_heat_tog",
    toggleWindowHeat: "sim/ice/window_heat_tog",
    servosOff: "sim/autopilot/servos_toggle",
    toggleFlightDirector: "sim/autopilot/fdir_toggle",
    setAutopilotHeadingMode: "sim/autopilot/heading",
    setAutopilotNavMode: "sim/autopilot/NAV",
    setAutopilotAltMode: "sim/autopilot/altitude_hold",
    setAutopilotApproachMode: "sim/autopilot/approach",
    setAutopilotBackCourseMode: "sim/autopilot/back_course",
    toggleYawDamper: "sim/systems/yaw_damper_toggle",
    noseUp: "sim/autopilot/nose_up_pitch_mode",
    noseDown: "sim/autopilot/nose_down_pitch_mode",
    headingUp: "sim/autopilot/heading_up",
    headingDown: "sim/autopilot/heading_down",
    headingSync: "sim/autopilot/heading_sync",
}

export type CommandName = keyof typeof commands
export type CommandValue = (typeof commands)[CommandName]

export type ButtonDefinition = {
    type: "button"
    incomingDataKey: string
    outgoingToggleCommand: CommandValue
    text: string
}

export type GearControlDefinition = {
    type: "gear"
}

export type ControlDefinition = ButtonDefinition | GearControlDefinition

export type ControlsDefinition = {
    rowId?: string
    controls: ControlDefinition[]
}[]

export const toggleButtons: ControlsDefinition = [
    {
        controls: [
            {
                type: "button",
                incomingDataKey: "parking-brake",
                outgoingToggleCommand: commands.toggleParkingBrake,
                text: "Parking Brake",
            },
            {
                type: "gear",
            },
        ],
    },
    {
        controls: [
            {
                type: "button",
                incomingDataKey: "navigation-lights",
                outgoingToggleCommand: commands.toggleNavLights,
                text: "Nav Lights",
            },
            {
                type: "button",
                incomingDataKey: "beacon",
                outgoingToggleCommand: commands.toggleBeacon,
                text: "Beacon",
            },
            {
                type: "button",
                incomingDataKey: "strobe-lights",
                outgoingToggleCommand: commands.toggleStrobe,
                text: "Strobe",
            },
            {
                type: "button",
                incomingDataKey: "taxi-lights",
                outgoingToggleCommand: commands.toggleTaxiLights,
                text: "Taxi lights",
            },
            {
                type: "button",
                incomingDataKey: "landing-lights-1",
                outgoingToggleCommand: commands.toggleLanding1,
                text: "Ldg Light",
            },

            {
                type: "button",
                incomingDataKey: "landing-lights-2",
                outgoingToggleCommand: commands.toggleLanding2,
                text: "Ldg Light",
            },
            /* Baron has two landing lights. Remove these for now.
                Useful for large aircraft like the B738.
            {
                incomingDataKey: 'landing-lights-3',
                outgoingToggleCommand: commands.toggleLanding3,
                buttonText: 'Ldg Light',
            },

            {
                incomingDataKey: 'landing-lights-4',
                outgoingToggleCommand: commands.toggleLanding4,
                buttonText: 'Ldg Light',
            },
            */
        ],
    },
    {
        rowId: "controls-row-2",
        controls: [
            {
                type: "button",
                incomingDataKey: "pitot-heat-1",
                outgoingToggleCommand: commands.togglePitot0,
                text: "Pitot Heat",
            },
            {
                type: "button",
                incomingDataKey: "pitot-heat-2",
                outgoingToggleCommand: commands.togglePitot1,
                text: "Pitot Heat",
            },
            {
                type: "button",
                incomingDataKey: "stall-warn-heat",
                outgoingToggleCommand: commands.toggleStallWarnHeat,
                text: "Stall Warn",
            },
            {
                type: "button",
                incomingDataKey: "prop-heat",
                outgoingToggleCommand: commands.togglePropHeat,
                text: "Prop Heat",
            },
            {
                type: "button",
                incomingDataKey: "window-heat",
                outgoingToggleCommand: commands.toggleWindowHeat,
                text: "Window Heat",
            },
        ],
    },
    {
        controls: [
            {
                type: "button",
                incomingDataKey: "autopilot-engaged",
                outgoingToggleCommand: commands.servosOff,
                text: "AP eng",
            },
            {
                type: "button",
                incomingDataKey: "flightdirector-engaged",
                outgoingToggleCommand: commands.toggleFlightDirector,
                text: "Flight dir",
            },
            {
                type: "button",
                incomingDataKey: "autopilot-heading-mode",
                outgoingToggleCommand: commands.setAutopilotHeadingMode,
                text: "AP HDG",
            },
            {
                type: "button",
                incomingDataKey: "autopilot-nav-mode",
                outgoingToggleCommand: commands.setAutopilotNavMode,
                text: "AP NAV",
            },
            {
                type: "button",
                incomingDataKey: "autopilot-alt-mode",
                outgoingToggleCommand: commands.setAutopilotAltMode,
                text: "AP ALT",
            },
            {
                type: "button",
                incomingDataKey: "autopilot-approach-mode",
                outgoingToggleCommand: commands.setAutopilotApproachMode,
                text: "AP APP",
            },
            {
                type: "button",
                incomingDataKey: "autopilot-back-course-mode",
                outgoingToggleCommand: commands.setAutopilotBackCourseMode,
                text: "AP BC",
            },
            {
                type: "button",
                incomingDataKey: "yaw-damper",
                outgoingToggleCommand: commands.toggleYawDamper,
                text: "Yaw damper",
            },
            {
                type: "button",
                incomingDataKey: "",
                outgoingToggleCommand: commands.noseUp,
                text: "Nose Up",
            },
            {
                type: "button",
                incomingDataKey: "",
                outgoingToggleCommand: commands.noseDown,
                text: "Nose Down",
            },
        ],
    },
    {
        controls: [
            {
                type: "button",
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingDown,
                text: "Heading -",
            },
            {
                type: "button",
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingUp,
                text: "Heading +",
            },
            {
                type: "button",
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingSync,
                text: "Heading sync",
            },
        ],
    },
]
