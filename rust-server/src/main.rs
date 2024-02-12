mod channels;
mod control_msgs;
mod gpio;
mod webserver;
mod xpc_types;
mod xplane_comms;

use std::{env, process::exit};

use channels::{create_channels, ChannelsController};
use control_msgs::ControlMessages;
use env_logger;
use gpio::run_gpio;
use log::{self, error, info};

use webserver::run_webserver;
use xplane_comms::run_comms;

#[tokio::main]
async fn main() {
    env_logger::init();

    let args: Vec<String> = env::args().collect();

    let port = if args.len() >= 2 {
        args[1].parse::<u16>().unwrap()
    } else {
        49007
    };

    info!("Port number is {}", port);

    let (controller_endpoint, xplane_comm_endpoint, ui_endpoint) = create_channels();

    tokio::spawn(async move {
        run_signal_handler(controller_endpoint).await;
    });

    run_gpio(&ui_endpoint);

    let ws_future = run_webserver(ui_endpoint);

    tokio::spawn(async move {
        if let Err(err) = run_comms(port, xplane_comm_endpoint).await {
            error!("Running the UDP communication failed: {:?}", err);
            exit(1);
        }
    });

    ws_future.await
}

async fn run_signal_handler(tx_chan: ChannelsController) {
    use tokio::signal::unix::{signal, SignalKind};

    let mut signal_terminate = signal(SignalKind::terminate()).unwrap();
    let mut signal_interrupt = signal(SignalKind::interrupt()).unwrap();

    tokio::select! {
        _ = signal_terminate.recv() => {
            error!("Received SIGTERM.");
            tx_chan.send_control(ControlMessages::Stop());
        }
        _ = signal_interrupt.recv() => {
            error!("Received SIGINT.");
            tx_chan.send_control(ControlMessages::Stop());
        }
    };
}
