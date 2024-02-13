use crate::channels::ChannelsUIEndpoint;

mod event_detect;
mod input_config;
mod linux;
mod types;

#[cfg(not(target_os = "linux"))]
pub fn run_gpio(_: &ChannelsUIEndpoint, _: &String) {
    log::info!("Not a linux platform, not initializing the GPIO.");
}

#[cfg(target_os = "linux")]
pub fn run_gpio(channels: &ChannelsUIEndpoint, config_file: &String) {
    let uic = channels.ui_cmds.clone();
    let cf = config_file.clone();
    tokio::spawn(async move { linux::gpio_main(uic, cf).await });
}
