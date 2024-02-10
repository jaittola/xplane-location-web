#[cfg(not(target_os = "linux"))]
pub fn run_gpio() {
    println!("Not a linux platform, not initializing the GPIO.");
}

#[cfg(target_os = "linux")]
pub fn run_gpio() {
    tokio::spawn(async move { gpio_linux::gpio_main().await });
}

#[cfg(target_os = "linux")]
mod gpio_linux {

    use tokio_gpiod::{Bias, Chip, Edge, EdgeDetect, Options};

    use crate::gpio_event_detect::{
        self, ButtonInput, EncoderCommands, EncoderInput, GpioEvent, GpioEventDetect, GpioInput,
    };

    pub async fn gpio_main() -> Option<()> {
        let chip = match Chip::new("gpiochip0").await {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Opening GPIO chip failed: {:?}", e);
                return None;
            }
        };

        println!(
            "Chip {}, label {} has {} lines",
            chip.name(),
            chip.label(),
            chip.num_lines()
        );

        let inputs = [
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
        ];

        let input_pins = inputs
            .iter()
            .map(|input| match input {
                GpioInput::Encoder(enc) => Vec::from([enc.gpio1 as u32, enc.gpio2 as u32]),
                GpioInput::Button(b) => Vec::from([b.gpio as u32]),
            })
            .flatten()
            .collect::<Vec<u32>>();

        let opts = Options::input(input_pins) // configure lines offsets
            .edge(EdgeDetect::Both)
            .bias(Bias::PullUp)
            .consumer("xplane-location-web"); // optionally set consumer string

        let mut gpio_inputs = chip
            .request_lines(opts)
            .await
            .map_err(|e| {
                eprintln!("Failed getting chip lines: {:?}", e);
                e
            })
            .ok()?;

        let mut event_detect = GpioEventDetect::new(&inputs);

        loop {
            let event = gpio_inputs.read_event().await.ok()?;

            println!("event: {:?}", event);

            match event_detect.on_event(event.line as usize, map_edge(event.edge), &event.time) {
                Some(GpioEvent::Encoder(ee)) => {
                    println!("Got encoder event {:?}", ee);
                }
                Some(e) => println!("Got another event {:?}", e),
                None => {}
            }
        }
    }

    fn map_edge(e: Edge) -> gpio_event_detect::Edge {
        match e {
            Edge::Falling => gpio_event_detect::Edge::Falling,
            Edge::Rising => gpio_event_detect::Edge::Rising,
        }
    }
}
