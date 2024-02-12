#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub enum EncoderEventType {
    Right,
    Left,
}

#[derive(Debug, Clone)]
pub struct EncoderEvent {
    pub event_type: EncoderEventType,
    pub encoder_name: String,
    pub command: String,
}

#[derive(Debug, Clone)]
pub struct ButtonEvent {
    pub command: String,
}

#[derive(Debug, Clone)]
pub enum GpioEvent {
    Encoder(EncoderEvent),
    Button(ButtonEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncoderInput {
    pub gpio1: usize,
    pub gpio2: usize,
    pub command: EncoderCommands,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonInput {
    pub gpio: usize,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchInput {
    pub gpio: usize,
    pub command_high: String,
    pub command_low: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GpioInput {
    #[serde(rename = "encoder")]
    Encoder(EncoderInput),
    #[serde(rename = "button")]
    Button(ButtonInput),
    #[serde(rename = "switch")]
    Switch(SwitchInput),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncoderCommands {
    pub encoder_name: String,
    pub cmd_right: String,
    pub cmd_left: String,
}

#[derive(Debug, Clone)]
pub enum Edge {
    Falling = 0,
    Rising = 1,
}
