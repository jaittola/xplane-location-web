export type ControlsButtonDefinition = {
    incomingDataKey: string
    outgoingToggleCommand: string
    buttonText: string
    buttonId?: string
}

export type ControlsDefinition = {
    rowId: string
    buttons: ControlsButtonDefinition[]
}[]

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

export const toggleButtons: ControlsDefinition = [
    {
        rowId: "controls-row-0",
        buttons: [
            {
                incomingDataKey: "parking-brake",
                outgoingToggleCommand: commands.toggleParkingBrake,
                buttonText: "Parking Brake",
            },
        ],
    },
    {
        rowId: "controls-row-1",
        buttons: [
            {
                incomingDataKey: "navigation-lights",
                outgoingToggleCommand: commands.toggleNavLights,
                buttonText: "Nav Lights",
            },
            {
                incomingDataKey: "beacon",
                outgoingToggleCommand: commands.toggleBeacon,
                buttonText: "Beacon",
            },
            {
                incomingDataKey: "strobe-lights",
                outgoingToggleCommand: commands.toggleStrobe,
                buttonText: "Strobe",
            },
            {
                incomingDataKey: "taxi-lights",
                outgoingToggleCommand: commands.toggleTaxiLights,
                buttonText: "Taxi lights",
            },
            {
                incomingDataKey: "landing-lights-1",
                outgoingToggleCommand: commands.toggleLanding1,
                buttonText: "Ldg Light",
            },

            {
                incomingDataKey: "landing-lights-2",
                outgoingToggleCommand: commands.toggleLanding2,
                buttonText: "Ldg Light",
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
        buttons: [
            {
                incomingDataKey: "pitot-heat-1",
                outgoingToggleCommand: commands.togglePitot0,
                buttonText: "Pitot Heat",
            },
            {
                incomingDataKey: "pitot-heat-2",
                outgoingToggleCommand: commands.togglePitot1,
                buttonText: "Pitot Heat",
            },
            {
                incomingDataKey: "stall-warn-heat",
                outgoingToggleCommand: commands.toggleStallWarnHeat,
                buttonText: "Stall Warn",
            },
            {
                incomingDataKey: "prop-heat",
                outgoingToggleCommand: commands.togglePropHeat,
                buttonText: "Prop Heat",
            },
            {
                incomingDataKey: "window-heat",
                outgoingToggleCommand: commands.toggleWindowHeat,
                buttonText: "Window Heat",
            },
        ],
    },
    {
        rowId: "controls-row-3",
        buttons: [
            {
                incomingDataKey: "autopilot-engaged",
                outgoingToggleCommand: commands.servosOff,
                buttonText: "AP eng",
            },
            {
                incomingDataKey: "flightdirector-engaged",
                outgoingToggleCommand: commands.toggleFlightDirector,
                buttonText: "Flight dir",
            },
            {
                incomingDataKey: "autopilot-heading-mode",
                outgoingToggleCommand: commands.setAutopilotHeadingMode,
                buttonText: "AP HDG",
            },
            {
                incomingDataKey: "autopilot-nav-mode",
                outgoingToggleCommand: commands.setAutopilotNavMode,
                buttonText: "AP NAV",
            },
            {
                incomingDataKey: "autopilot-alt-mode",
                outgoingToggleCommand: commands.setAutopilotAltMode,
                buttonText: "AP ALT",
            },
            {
                incomingDataKey: "autopilot-approach-mode",
                outgoingToggleCommand: commands.setAutopilotApproachMode,
                buttonText: "AP APP",
            },
            {
                incomingDataKey: "autopilot-back-course-mode",
                outgoingToggleCommand: commands.setAutopilotBackCourseMode,
                buttonText: "AP BC",
            },
            {
                incomingDataKey: "yaw-damper",
                outgoingToggleCommand: commands.toggleYawDamper,
                buttonText: "Yaw damper",
            },
            {
                incomingDataKey: "",
                outgoingToggleCommand: commands.noseUp,
                buttonText: "Nose Up",
            },
            {
                incomingDataKey: "",
                outgoingToggleCommand: commands.noseDown,
                buttonText: "Nose Down",
            },
        ],
    },
    {
        rowId: "controls-row-4",
        buttons: [
            {
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingDown,
                buttonText: "Heading -",
            },
            {
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingUp,
                buttonText: "Heading +",
            },
            {
                incomingDataKey: "",
                outgoingToggleCommand: commands.headingSync,
                buttonText: "Heading sync",
            },
        ],
    },
]
