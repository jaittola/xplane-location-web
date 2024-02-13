#![cfg(target_os = "linux")]

use std::io;

use futures_util::StreamExt;
use log::{debug, error, info};
use tokio::select;
use tokio::sync::mpsc::Sender;
use tokio_gpiod::{Bias, Chip, Edge, EdgeDetect, Event, Input, Lines, Options};
use tokio_util::time::delay_queue::Expired;
use tokio_util::time::DelayQueue;

use super::event_detect::GpioEventDetect;
use super::input_config::read_input_config;
use super::types::{Edge as GpioEdge, GpioEvent, GpioInput, PendingEvent};
use crate::xpc_types::UICommand;

pub async fn gpio_main(ui_cmds: Sender<UICommand>, config_file: String) -> Result<(), io::Error> {
    let chip = Chip::new("gpiochip0").await.map_err(|e| {
        error!("Opening GPIO chip failed: {:?}", e);
        io::Error::other(e.to_string())
    })?;

    info!(
        "Chip {}, label {} has {} lines",
        chip.name(),
        chip.label(),
        chip.num_lines()
    );

    let inputs = read_input_config(&config_file)?;

    let input_pins = inputs
        .iter()
        .map(|input| match input {
            GpioInput::Encoder(enc) => Vec::from([enc.gpio1 as u32, enc.gpio2 as u32]),
            GpioInput::Button(b) => Vec::from([b.gpio as u32]),
            GpioInput::Switch(sw) => Vec::from([sw.gpio as u32]),
        })
        .flatten()
        .collect::<Vec<u32>>();

    debug!("Requesting GPIOs {:?}", input_pins);

    let opts = Options::input(input_pins) // configure lines offsets
        .edge(EdgeDetect::Both)
        .bias(Bias::PullUp)
        .consumer("xplane-location-web"); // optionally set consumer string

    let mut gpio_inputs = chip.request_lines(opts).await.map_err(|e| {
        error!("Failed getting chip lines: {:?}", e);
        e
    })?;

    let mut event_detect = GpioEventDetect::new(&inputs);
    let mut pending_events = DelayQueue::<PendingEvent>::new();

    loop {
        if pending_events.is_empty() {
            let event = gpio_inputs.read_event().await?;
            process_event(&event, &mut event_detect, &mut pending_events, &ui_cmds).await;
        } else {
            select! {
                Ok(event) = gpio_inputs.read_event() => {
                    process_event(&event, &mut event_detect, &mut pending_events, &ui_cmds).await;
                },
                e = pending_events.next() => {
                    process_pending_event(e, &mut gpio_inputs, &mut event_detect, &ui_cmds).await?;
                }
            }
        }
    }
}

async fn process_event(
    event: &Event,
    event_detect: &mut GpioEventDetect,
    pending_events: &mut DelayQueue<PendingEvent>,
    ui_cmds: &Sender<UICommand>,
) {
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
        Some(GpioEvent::Pending { debounce, event }) => {
            info!("Got switch pending event {:?}", event);
            pending_events.insert(event, debounce);
        }
        None => {}
    }
}

async fn process_pending_event(
    opt: Option<Expired<PendingEvent>>,
    lines: &mut Lines<Input>,
    event_detect: &mut GpioEventDetect,
    ui_cmds: &Sender<UICommand>,
) -> Result<(), io::Error> {
    debug!("pending event: {:?}", opt);

    let pending = match opt {
        Some(ev) => Ok(ev.into_inner()),
        None => Err(io::Error::other("Got unexpected empty pending event")),
    }?;

    let pin = pending.pin();
    let value = lines.get_values([false; 64]).await?[pin];

    if let Some(rpe) = event_detect.on_pending_event(&pending, value) {
        info!("Got resolved pending event {:?}", rpe);
        ui_cmds
            .send(UICommand {
                command: rpe.command,
            })
            .await
            .ok();
    }

    Ok(())
}

fn map_edge(e: Edge) -> GpioEdge {
    match e {
        Edge::Falling => GpioEdge::Falling,
        Edge::Rising => GpioEdge::Rising,
    }
}
