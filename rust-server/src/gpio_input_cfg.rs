#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

use crate::gpio_event_detect::{ButtonInput, EncoderCommands, EncoderInput, GpioInput};

use std::fs::File;
use std::io::BufReader;

#[allow(dead_code)]
pub fn sample_inputs() -> Vec<GpioInput> {
    [
        GpioInput::Encoder(EncoderInput {
            gpio1: 23,
            gpio2: 24,
            command: EncoderCommands {
                encoder_name: String::from("Left top"),
                cmd_right: String::from("test_right"),
                cmd_left: String::from("test_left"),
            },
        }),
        GpioInput::Encoder(EncoderInput {
            gpio1: 14,
            gpio2: 15,
            command: EncoderCommands {
                encoder_name: String::from("Left 2nd top"),
                cmd_right: String::from("test_right_2nd"),
                cmd_left: String::from("test_left_2nd"),
            },
        }),
        GpioInput::Button(ButtonInput {
            gpio: 18,
            command: String::from("button!"),
        }),
    ]
    .to_vec()
}

pub fn read_input_config() -> Result<Vec<GpioInput>, std::io::Error> {
    let cfgfile = "hw-inputs.json";
    let input_file = File::open(cfgfile).map_err(|e| {
        eprintln!("Reading configuration file {} failed: {:?}", cfgfile, e);
        e
    })?;
    let buf_reader = BufReader::new(input_file);
    serde_json::from_reader(buf_reader).map_err(|e| {
        let s = e.to_string();
        eprintln!("Reading configuration file {} failed: {:?}", cfgfile, s);
        std::io::Error::other(s)
    })
}

#[cfg(test)]
mod gpio_input_cfg_tests {
    use std::fs::File;
    use std::io::{prelude::*, BufReader};

    use crate::gpio_event_detect::GpioInput;
    use crate::gpio_input_cfg::read_input_config;

    use super::sample_inputs;

    #[test]
    fn serialise_and_deserialize_config() {
        let s = serde_json::to_string(&sample_inputs()).unwrap();
        let filename = "sample-cfg.json";

        {
            let mut file = File::create(filename).unwrap();
            file.write_all(s.as_bytes()).unwrap();
            file.flush().unwrap();
        }

        {
            let input_file = File::open(filename).unwrap();
            let buf_reader = BufReader::new(input_file);
            let cfg2: Vec<GpioInput> = serde_json::from_reader(buf_reader).unwrap();
            println!("Deserialized content is {:#?}", cfg2);
        }
    }

    #[test]
    fn deserialize_current_config() {
        let cfg = read_input_config().unwrap();
        println!("Current configuration is {:#?}", cfg);
    }
}
