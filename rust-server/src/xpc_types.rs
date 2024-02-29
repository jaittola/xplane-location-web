use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize)]
pub struct ReceivedDatarefs {
    #[serde(rename = "has-retracting-gear")]
    pub has_retracting_gear: bool,

    #[serde(rename = "is-gear-unsafe")]
    pub is_gear_unsafe: bool,

    #[serde(rename = "is-gear-handle-down")]
    pub is_gear_handle_down: bool,

    #[serde(rename = "avionics-power")]
    pub avionics_power: bool,

    #[serde(rename = "navigation-lights")]
    pub navigation_lights: bool,

    #[serde(rename = "beacon")]
    pub beacon: bool,

    #[serde(rename = "strobe-lights")]
    pub strobe_lights: bool,

    #[serde(rename = "taxi-lights")]
    pub taxi_lights: bool,

    #[serde(rename = "parking-brake")]
    pub parking_brake: bool,

    #[serde(rename = "landing-lights-1")]
    pub landing_lights_1: bool,

    #[serde(rename = "landing-lights-2")]
    pub landing_lights_2: bool,

    #[serde(rename = "pitot-heat-1")]
    pub pitot_heat_1: bool,

    #[serde(rename = "pitot-heat-2")]
    pub pitot_heat_2: bool,

    #[serde(rename = "stall-warn-heat")]
    pub stall_warn_heat: bool,

    #[serde(rename = "prop-heat")]
    pub prop_heat: bool,

    #[serde(rename = "window-heat")]
    pub window_heat: bool,

    #[serde(rename = "flightdirector-engaged")]
    pub autopilot_flight_director: bool,

    #[serde(rename = "autopilot-engaged")]
    pub autopilot_engaged: bool,

    #[serde(rename = "autopilot-heading-mode")]
    pub autopilot_heading_mode: bool,

    #[serde(rename = "autopilot-alt-mode")]
    pub autopilot_alt_hold_mode: bool,

    #[serde(rename = "autopilot-approach-mode")]
    pub autopilot_approach_mode: bool,

    #[serde(rename = "autopilot-nav-mode")]
    pub autopilot_nav_mode: bool,

    #[serde(rename = "autopilot-back-course-mode")]
    pub autopilot_back_course_mode: bool,

    #[serde(rename = "yaw-damper")]
    pub yaw_damper: bool,

    pub ias: f32,

    pub tas: f32,

    #[serde(rename = "mag-heading")]
    pub mag_heading: f32,

    pub altitude: f32,

    pub lat: Option<f32>,

    pub lon: Option<f32>,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct UICommand {
    pub command: String,
}
