#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

#[derive(Debug, Clone)]
pub enum EncoderEventType {
    Right,
    Left,
}

#[derive(Debug, Clone)]
pub struct EncoderEvent {
    pub event_type: EncoderEventType,
    pub encoder_name: String,
    pub cmd: String,
}

#[derive(Debug, Clone)]
pub enum GpioEvent {
    Encoder(EncoderEvent),
}

#[derive(Debug, Clone)]
pub struct EncoderInput {
    pub gpio1: usize,
    pub gpio2: usize,
    pub command: EncoderCommands,
}

#[derive(Debug, Clone)]
pub struct ButtonInput {
    pub gpio: usize,
    pub command: String,
}

#[derive(Debug, Clone)]
pub enum GpioInput {
    Encoder(EncoderInput),
    Button(ButtonInput),
}

#[derive(Debug, Clone)]
pub struct EncoderCommands {
    pub encoder_name: String,
    pub cmd_right: String,
    pub cmd_left: String,
}

#[derive(Debug, Clone)]
pub struct EncoderWithPins {
    encoder: EncoderInput,
    pin1: usize,
    pin2: usize,
}

#[derive(Debug, Clone)]
pub enum Edge {
    Falling = 0,
    Rising = 1,
}

pub struct GpioEventDetect {
    pin_states: [u8; MAX_PINS],
    encoders: Vec<InputSlot>,
}

const MAX_PINS: usize = 100;

#[derive(Debug, Clone)]
enum InputSlot {
    Unused,
    AssignedToEncoder { encoder: EncoderWithPins },
}

impl GpioEventDetect {
    pub fn new(inputs: &[GpioInput]) -> GpioEventDetect {
        let mut input_slots = Vec::new();
        input_slots.resize(MAX_PINS, InputSlot::Unused);

        let mut ed = GpioEventDetect {
            pin_states: [0xff; MAX_PINS],
            encoders: input_slots,
        };

        for (i, input) in inputs.iter().enumerate() {
            match input {
                GpioInput::Encoder(encoder) => ed.register_encoder(i, encoder),
                _ => {}
            }
        }

        ed
    }

    pub fn register_encoder(&mut self, idx: usize, encoder: &EncoderInput) {
        let pin1 = 2 * idx;
        let pin2 = 2 * idx + 1;
        let slot = InputSlot::AssignedToEncoder {
            encoder: EncoderWithPins {
                encoder: encoder.clone(),
                pin1: 2 * idx,
                pin2: 2 * idx + 1,
            },
        };

        self.encoders[pin1] = slot.clone();
        self.encoders[pin2] = slot;
    }

    pub fn on_event(&mut self, pin: usize, edge: Edge) -> Option<GpioEvent> {
        match &self.encoders[pin] {
            InputSlot::AssignedToEncoder { encoder } => {
                on_encoder_event(pin, edge, encoder, &mut self.pin_states)
                    .map(|ee| GpioEvent::Encoder(ee))
            }
            _ => None,
        }
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
            cmd: enc.encoder.command.cmd_right.clone(),
        }),
        0x93 => Some(EncoderEvent {
            event_type: EncoderEventType::Left,
            encoder_name: enc.encoder.command.encoder_name.clone(),
            cmd: enc.encoder.command.cmd_left.clone(),
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

    use super::Edge;
    use super::EncoderCommands;
    use super::EncoderEventType;
    use super::EncoderInput;
    use super::GpioEvent;
    use super::GpioEventDetect;
    use super::GpioInput;

    fn ei() -> [GpioInput; 1] {
        [GpioInput::Encoder(EncoderInput {
            gpio1: 14,
            gpio2: 15,
            command: EncoderCommands {
                encoder_name: String::from("test"),
                cmd_right: String::from("right"),
                cmd_left: String::from("left"),
            },
        })]
    }

    #[test]
    fn enc_left() {
        let mut input_map = GpioEventDetect::new(&ei());

        assert!(input_map.on_event(1, Edge::Falling).is_none());
        assert!(input_map.on_event(0, Edge::Falling).is_none());
        assert!(input_map.on_event(1, Edge::Rising).is_none());
        let ev = input_map.on_event(0, Edge::Rising);

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.cmd, "left");
                assert!(matches!(ee.event_type, EncoderEventType::Left));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }

    #[test]
    fn enc_right() {
        let mut input_map = GpioEventDetect::new(&ei());

        assert!(input_map.on_event(0, Edge::Falling).is_none());
        assert!(input_map.on_event(1, Edge::Falling).is_none());
        assert!(input_map.on_event(0, Edge::Rising).is_none());
        let ev = input_map.on_event(1, Edge::Rising);

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.cmd, "right");
                assert!(matches!(ee.event_type, EncoderEventType::Right));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }
    }

    #[test]
    fn enc_debounce() {
        let mut input_map = GpioEventDetect::new(&ei());

        assert!(input_map.on_event(0, Edge::Falling).is_none());
        assert!(input_map.on_event(1, Edge::Falling).is_none());
        assert!(input_map.on_event(1, Edge::Falling).is_none());
        assert!(input_map.on_event(0, Edge::Rising).is_none());
        let ev = input_map.on_event(1, Edge::Rising);

        match ev {
            Some(GpioEvent::Encoder(ee)) => {
                assert_eq!(ee.cmd, "right");
                assert!(matches!(ee.event_type, EncoderEventType::Right));
            }
            _ => panic!("Got unexpected event {:?}", ev),
        }

        assert!(input_map.on_event(1, Edge::Rising).is_none());
    }
}
