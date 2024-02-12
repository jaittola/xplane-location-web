use crate::channels::ChannelsUIEndpoint;

mod event_detect;
mod input_config;
mod linux;
mod types;

#[cfg(not(target_os = "linux"))]
pub fn run_gpio(_: &ChannelsUIEndpoint) {
    log::info!("Not a linux platform, not initializing the GPIO.");
}

#[cfg(target_os = "linux")]
pub fn run_gpio(channels: &ChannelsUIEndpoint) {
    let uic = channels.ui_cmds.clone();
    tokio::spawn(async move { linux::gpio_main(uic).await });
}
