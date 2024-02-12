#![cfg(target_os = "linux")]

use log::{debug, error, info};
use tokio::sync::mpsc::Sender;
use tokio_gpiod::{Bias, Chip, Edge, EdgeDetect, Options};

use super::event_detect::GpioEventDetect;
use super::input_config::read_input_config;
use super::types::{Edge as GpioEdge, GpioEvent, GpioInput};
use crate::xpc_types::UICommand;

pub async fn gpio_main(ui_cmds: Sender<UICommand>) -> Result<(), std::io::Error> {
    let chip = Chip::new("gpiochip0").await.map_err(|e| {
        error!("Opening GPIO chip failed: {:?}", e);
        std::io::Error::other(e.to_string())
    })?;

    info!(
        "Chip {}, label {} has {} lines",
        chip.name(),
        chip.label(),
        chip.num_lines()
    );

    let inputs = read_input_config()?;

    let input_pins = inputs
        .iter()
        .map(|input| match input {
            GpioInput::Encoder(enc) => Vec::from([enc.gpio1 as u32, enc.gpio2 as u32]),
            GpioInput::Button(b) => Vec::from([b.gpio as u32]),
            GpioInput::Switch(_) => Vec::from([]),
        })
        .flatten()
        .collect::<Vec<u32>>();

    let opts = Options::input(input_pins) // configure lines offsets
        .edge(EdgeDetect::Both)
        .bias(Bias::PullUp)
        .consumer("xplane-location-web"); // optionally set consumer string

    let mut gpio_inputs = chip.request_lines(opts).await.map_err(|e| {
        error!("Failed getting chip lines: {:?}", e);
        e
    })?;

    let mut event_detect = GpioEventDetect::new(&inputs);

    loop {
        let event = gpio_inputs.read_event().await?;

        debug!("event: {:?}", event);

        match event_detect.on_event(event.line as usize, map_edge(event.edge), &event.time) {
            Some(GpioEvent::Encoder(ee)) => {
                info!("Got encoder event {:?}", ee);
                ui_cmds
                    .send(UICommand {
                        command: ee.command,
                    })
                    .await
                    .ok();
            }
            Some(GpioEvent::Button(be)) => {
                info!("Got button event {:?}", be);
                ui_cmds
                    .send(UICommand {
                        command: be.command,
                    })
                    .await
                    .ok();
            }
            None => {}
        }
    }
}

fn map_edge(e: Edge) -> GpioEdge {
    match e {
        Edge::Falling => GpioEdge::Falling,
        Edge::Rising => GpioEdge::Rising,
    }
}
