#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

use super::types::GpioInput;

use log::error;
use std::fs::File;
use std::io::BufReader;

pub fn read_input_config(config_file: &String) -> Result<Vec<GpioInput>, std::io::Error> {
    let input_file = File::open(config_file).map_err(|e| {
        error!("Reading configuration file {} failed: {:?}", config_file, e);
        e
    })?;
    let buf_reader = BufReader::new(input_file);
    serde_json::from_reader(buf_reader).map_err(|e| {
        let s = e.to_string();
        error!("Reading configuration file {} failed: {:?}", config_file, s);
        std::io::Error::other(s)
    })
}

#[cfg(test)]
mod gpio_input_cfg_tests {
    use std::fs::File;
    use std::io::{prelude::*, BufReader};

    use super::super::types::{ButtonInput, EncoderCommands, EncoderInput, GpioInput};

    use super::read_input_config;

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
        let cfg = read_input_config(&String::from("hw-inputs.json")).unwrap();
        println!("Current configuration is {:#?}", cfg);
    }

    fn sample_inputs() -> Vec<GpioInput> {
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
}
