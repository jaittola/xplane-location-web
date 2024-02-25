mod channels;
mod control_msgs;
mod gpio;
mod webserver;
mod xpc_types;
mod xplane_comms;

use channels::{create_channels, ChannelsController};
use control_msgs::ControlMessages;
use env_logger::{self, Env};
use gpio::run_gpio;
use log::{self, error, info};

use webserver::run_webserver;
use xplane_comms::run_xplane_udp;

use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about, long_about=None)]
struct CommandArgs {
    /// Name of the GPIO input configuration file
    #[arg(short, long)]
    gpio_conf: Option<String>,

    /// UDP port number for communicating with X-Plane
    #[arg(short, long, default_value_t = 49007)]
    udp_port: u16,

    /// Port number for the web UI
    #[arg(short = 'p', long, default_value_t = 3000)]
    web_port: u16,

    /// Web content directory
    #[arg(short, long, default_value_t = String::from("../www"))]
    web_directory: String,

    /// Log level
    #[arg(short, long, default_value_t = String::from("error"))]
    log_level: String,
}

#[tokio::main]
async fn main() {
    let args = CommandArgs::parse();

    env_logger::Builder::from_env(Env::default().default_filter_or(&args.log_level)).init();

    info!("Command line args: {:#?}", args);

    let (controller_endpoint, xplane_comm_endpoint, ui_endpoint) = create_channels();

    tokio::spawn(async move {
        run_signal_handler(controller_endpoint).await;
    });

    if let Some(gpio_conf) = args.gpio_conf {
        run_gpio(&ui_endpoint, &gpio_conf);
    } else {
        info!("GPIO configuration file not defined, not starting GPIO");
    }

    let ws_future = run_webserver(ui_endpoint, args.web_port, &args.web_directory);

    tokio::spawn(async move {
        if let Err(err) = run_xplane_udp(args.udp_port, xplane_comm_endpoint).await {
            error!("Running the UDP communication failed: {:?}", err);
            std::process::exit(1);
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
