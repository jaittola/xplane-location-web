#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

use std::time::Duration;

use super::types::{
    ButtonEvent, ButtonInput, Edge, EncoderEvent, EncoderEventType, EncoderInput, GpioEvent,
    GpioInput,
};

#[derive(Debug, Clone)]
struct EncoderWithPins {
    encoder: EncoderInput,
    pin1: usize,
    pin2: usize,
}

pub struct GpioEventDetect {
    pin_states: [u8; MAX_PINS],
    input_slots: Vec<InputSlot>,
    last_event_times: [Duration; MAX_PINS],
}

const MAX_PINS: usize = 100;
const DEBOUNCE: Duration = Duration::from_millis(50);

#[derive(Debug, Clone)]
enum InputSlot {
    Unused,
    AssignedToEncoder { encoder: EncoderWithPins },
    AssignedToButton { button: ButtonInput },
}

impl GpioEventDetect {
    pub fn new(inputs: &[GpioInput]) -> GpioEventDetect {
        let mut input_slots = Vec::new();
        input_slots.resize(MAX_PINS, InputSlot::Unused);

        let mut event_detect = GpioEventDetect {
            pin_states: [0xff; MAX_PINS],
            input_slots,
            last_event_times: [Duration::ZERO; MAX_PINS],
        };

        let mut idx = 0;
        for input in inputs.iter() {
            idx = match input {
                GpioInput::Encoder(encoder) => event_detect.register_encoder(idx, encoder),
                GpioInput::Button(button) => event_detect.register_button(idx, button),
                GpioInput::Switch(_) => idx,
            };
        }

        event_detect
    }

    pub fn register_encoder(&mut self, pin: usize, encoder: &EncoderInput) -> usize {
        let pin1 = pin;
        let pin2 = pin + 1;
        let slot = InputSlot::AssignedToEncoder {
            encoder: EncoderWithPins {
                encoder: encoder.clone(),
                pin1,
                pin2,
            },
        };

        self.input_slots[pin1] = slot.clone();
        self.input_slots[pin2] = slot;

        pin + 2
    }

    pub fn register_button(&mut self, pin: usize, button: &ButtonInput) -> usize {
        self.input_slots[pin] = InputSlot::AssignedToButton {
            button: button.clone(),
        };

        pin + 1
    }

    pub fn on_event(&mut self, pin: usize, edge: Edge, time: &Duration) -> Option<GpioEvent> {
        match &self.input_slots[pin] {
            InputSlot::AssignedToEncoder { encoder } => {
                on_encoder_event(pin, edge, encoder, &mut self.pin_states)
                    .map(|ee| GpioEvent::Encoder(ee))
            }
            InputSlot::AssignedToButton { button } => on_button_event(
                pin,
                edge,
                time,
                button,
                &mut self.pin_states,
                &mut self.last_event_times,
            )
            .map(|be| GpioEvent::Button(be)),
            _ => None,
        }
    }
}

fn on_button_event(
    pin: usize,
    edge: Edge,
    event_time: &Duration,
    button: &ButtonInput,
    pin_states: &mut [u8; MAX_PINS],
    last_event_times: &mut [Duration; MAX_PINS],
) -> Option<ButtonEvent> {
    let value = edge as u8;
    let prev_value = pin_states[pin] & 0x1;

    pin_states[pin] = value;

    let last_ev_time = last_event_times[pin];

    if prev_value == 0
        && value == 1
        && (last_ev_time.is_zero() || event_time >= &(last_ev_time + DEBOUNCE))
    {
        last_event_times[pin] = event_time.clone();

        Some(ButtonEvent {
            command: button.command.clone(),
        })
    } else {
        None
    }
}

fn on_encoder_event(
    pin: usize,
    edge: Edge,
    encoder: &EncoderWithPins,
    pin_states: &mut [u8; MAX_PINS],
) -> Option<EncoderEvent> {
    let value = edge as u8;

    let other_pin = get_other_pin(pin, encoder);
    let pinstate = pin_states[pin];
    let other_pinstate = pin_states[other_pin];

    if (pinstate & 0x1) != value {
        pin_states[pin] = (pinstate << 1) | value;
        pin_states[other_pin] = (other_pinstate << 1) | (other_pinstate & 0x1);
        get_encoder_event_for_pin(encoder, pin_states)
    } else {
        None
    }
}

fn get_encoder_event_for_pin(
    enc: &EncoderWithPins,
    pin_states: &[u8; MAX_PINS],
) -> Option<EncoderEvent> {
    let pin_state_1 = pin_states[enc.pin1];
    let pin_state_2 = pin_states[enc.pin2];

    let pattern = ((pin_state_1 & 0xf) << 4) | (pin_state_2 & 0xf);
    match pattern {
        0x39 => Some(EncoderEvent {
            event_type: EncoderEventType::Right,
            encoder_name: enc.encoder.command.encoder_name.clone(),
            command: enc.encoder.command.cmd_right.clone(),
        }),
        0x93 => Some(EncoderEvent {
            event_type: EncoderEventType::Left,
            encoder_name: enc.encoder.command.encoder_name.clone(),
            command: enc.encoder.command.cmd_left.clone(),
        }),
        _ => None,
    }
}

fn get_other_pin(pin: usize, encoder: &EncoderWithPins) -> usize {
    if pin == encoder.pin1 {
        encoder.pin2
    } else {
        encoder.pin1
    }
}

#[cfg(test)]
mod gpio_tests {

    use std::time::Duration;

    use super::ButtonInput;
    use super::Edge;
    use super::EncoderEventType;
    use super::EncoderInput;
    use super::GpioEvent;
    use super::GpioEventDetect;
    use super::GpioInput;

    use super::super::types::EncoderCommands;

    fn test_inputs() -> [GpioInput; 2] {
        [
            GpioInput::Encoder(EncoderInput {
                gpio1: 14,
                gpio2: 15,
                command: EncoderCommands {
                    encoder_name: String::from("test"),
                    cmd_right: String::from("right"),
                    cmd_left: String::from("left"),
                },
            }),
            GpioInput::Button(ButtonInput {
                gpio: 16,
                command: String::from("tapped"),
            }),
        ]
    }

    fn t(ms: u64) -> Duration {
        Duration::ZERO + Duration::from_millis(ms)
    }

    #[test]
    fn enc_left() {
        let mut input_map = GpioEventDetect::new(&test_inputs());

        assert!(input_map.on_event(1, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(0, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(1, Edge::Rising, &t(0)).is_none());
        let ev = input_map.on_event(0, Edge::Rising, &t(0));

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.command, "left");
                assert!(matches!(ee.event_type, EncoderEventType::Left));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }

    #[test]
    fn enc_right() {
        let mut input_map = GpioEventDetect::new(&test_inputs());

        assert!(input_map.on_event(0, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(1, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(0, Edge::Rising, &t(0)).is_none());
        let ev = input_map.on_event(1, Edge::Rising, &t(0));

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.command, "right");
                assert!(matches!(ee.event_type, EncoderEventType::Right));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }

    #[test]
    fn enc_debounce() {
        let mut input_map = GpioEventDetect::new(&test_inputs());

        assert!(input_map.on_event(0, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(1, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(1, Edge::Falling, &t(0)).is_none());
        assert!(input_map.on_event(0, Edge::Rising, &t(0)).is_none());
        let ev = input_map.on_event(1, Edge::Rising, &t(0));

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.command, "right");
                assert!(matches!(ee.event_type, EncoderEventType::Right));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }

        assert!(input_map.on_event(1, Edge::Rising, &t(0)).is_none());
    }

    #[test]
    fn button_press() {
        let mut input_map = GpioEventDetect::new(&test_inputs());

        assert!(input_map.on_event(2, Edge::Falling, &t(0)).is_none());
        let ev = input_map.on_event(2, Edge::Rising, &t(0));
        match ev {
            Some(GpioEvent::Button(be)) => {
                assert_eq!(be.command, "tapped")
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }

    #[test]
    fn button_press_debounce() {
        let mut input_map = GpioEventDetect::new(&test_inputs());

        assert!(input_map.on_event(2, Edge::Falling, &t(0)).is_none());
        let ev = input_map.on_event(2, Edge::Rising, &t(51));
        match ev {
            Some(GpioEvent::Button(be)) => {
                assert_eq!(be.command, "tapped");
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }

        assert!(input_map.on_event(2, Edge::Rising, &t(52)).is_none());
        assert!(input_map.on_event(2, Edge::Falling, &t(90)).is_none());
        assert!(input_map.on_event(2, Edge::Rising, &t(99)).is_none());

        assert!(input_map.on_event(2, Edge::Falling, &t(101)).is_none());
        let ev = input_map.on_event(2, Edge::Rising, &t(102));
        match ev {
            Some(GpioEvent::Button(be)) => {
                assert_eq!(be.command, "tapped");
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }
}
