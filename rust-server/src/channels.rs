use log::error;
use tokio::sync::mpsc::{self, Receiver as MPSCReceiver, Sender as MPSCSender};

use crate::control_msgs::ControlMessages;
use crate::xpc_types::UICommand;
use crate::xplane_comms::ReceivedDatarefs;

#[derive(Debug)]
pub struct ChannelsController {
    control: MPSCSender<ControlMessages>,
}

impl ChannelsController {
    pub async fn send_control(&self, msg: ControlMessages) {
        if let Err(e) = self.control.send(msg).await {
            error!("Failed to send control msg: {:?}", e);
        }
    }
}

#[derive(Debug)]
pub struct ChannelsXPlaneCommEndpoint {
    pub control: MPSCReceiver<ControlMessages>,
    pub datarefs: MPSCSender<ReceivedDatarefs>,
    pub ui_cmds: MPSCReceiver<UICommand>,
}

#[derive(Debug)]
pub struct ChannelsUIEndpoint {
    pub data: MPSCReceiver<ReceivedDatarefs>,
    pub ui_cmds: MPSCSender<UICommand>,
}

pub fn create_channels() -> (
    ChannelsController,
    ChannelsXPlaneCommEndpoint,
    ChannelsUIEndpoint,
) {
    let (ctrl_tx, ctrl_rx) = mpsc::channel::<ControlMessages>(2);
    let (data_tx, data_rx) = mpsc::channel::<ReceivedDatarefs>(2);
    let (ui_cmds_tx, ui_cmds_rx) = mpsc::channel::<UICommand>(20);

    let xp_comm_endpoint = ChannelsXPlaneCommEndpoint {
        control: ctrl_rx,
        datarefs: data_tx,
        ui_cmds: ui_cmds_rx,
    };
    let ui_endpoint = ChannelsUIEndpoint {
        data: data_rx,
        ui_cmds: ui_cmds_tx,
    };
    let controller = ChannelsController { control: ctrl_tx };

    (controller, xp_comm_endpoint, ui_endpoint)
}
