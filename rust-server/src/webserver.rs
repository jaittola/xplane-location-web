use std::{convert::Infallible, sync::Arc};

use log::debug;
use tokio::sync::mpsc::Sender as MPSCSender;
use tokio::{select, sync::Mutex};
use warp::{
    filters::ws::{Message, WebSocket},
    Filter,
};

use futures_util::{SinkExt, StreamExt};

use crate::{channels::ChannelsUIEndpoint, xpc_types::UICommand, xplane_comms::ReceivedDatarefs};

pub async fn run_webserver(channels: ChannelsUIEndpoint, port: u16, web_files_dir: &String) {
    let datarefs = Arc::new(Mutex::new(ReceivedDatarefs {
        ..Default::default()
    }));
    let datarefs_clone = datarefs.clone();

    let ChannelsUIEndpoint {
        mut data,
        ui_cmds: commands_from_ui,
    } = channels;

    let data_receiver = tokio::spawn(async move {
        loop {
            select! {
                Some(dr) = data.recv() => {
                    let mut datarefs_unlocked = datarefs.lock().await;
                    *datarefs_unlocked = dr;
                },
            }
        }
    });

    let readme = warp::path("readme").map(|| "Boom, readme");
    let datarefs_route = warp::path("datarefs")
        .and(with_datarefs(datarefs_clone.clone()))
        .and_then(reply_with_datarefs);
    let websocket = warp::path("websocket")
        .and(warp::ws())
        .and(with_datarefs(datarefs_clone.clone()))
        .and(with_cmdchan(commands_from_ui))
        .map(|ws: warp::ws::Ws, datarefs, cmdchan| {
            ws.on_upgrade(|websocket| run_websocket(websocket, datarefs, cmdchan))
        });
    let static_files = warp::any().and(warp::fs::dir(web_files_dir.clone()));
    let routes = readme.or(datarefs_route).or(websocket).or(static_files);

    warp::serve(routes).bind(([0, 0, 0, 0], port)).await;
    data_receiver.abort();
}

async fn reply_with_datarefs(
    datarefs: Arc<Mutex<ReceivedDatarefs>>,
) -> Result<impl warp::reply::Reply, Infallible> {
    let reply = {
        let dr = unwrap_datarefs(&datarefs).await;
        warp::reply::json(&dr)
    };

    Ok(reply)
}

async fn run_websocket(
    ws: WebSocket,
    datarefs: Arc<Mutex<ReceivedDatarefs>>,
    cmdchan: MPSCSender<UICommand>,
) {
    let (mut tx, mut rx) = ws.split();

    tokio::spawn(async move {
        loop {
            let dr = unwrap_datarefs(&datarefs).await;
            let msg = Message::text(serde_json::to_string(&dr).unwrap());
            if let Err(_) = tx.send(msg).await {
                break;
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        }
    });

    tokio::spawn(async move {
        while let Some(Ok(msg)) = rx.next().await {
            if msg.is_close() {
                break;
            }
            if let Ok(str_msg) = msg.to_str() {
                if let Ok(cmd) = serde_json::from_str::<UICommand>(str_msg) {
                    debug!("Got command {}", cmd.command);
                    cmdchan.send(cmd).await.ok();
                }
            }
        }
    });
}

fn with_datarefs(
    datarefs: Arc<Mutex<ReceivedDatarefs>>,
) -> impl Filter<Extract = (Arc<Mutex<ReceivedDatarefs>>,), Error = Infallible> + Clone {
    warp::any().map(move || datarefs.clone())
}

fn with_cmdchan(
    cmdchan: MPSCSender<UICommand>,
) -> impl Filter<Extract = (MPSCSender<UICommand>,), Error = Infallible> + Clone {
    warp::any().map(move || cmdchan.clone())
}

async fn unwrap_datarefs(datarefs: &Arc<Mutex<ReceivedDatarefs>>) -> ReceivedDatarefs {
    datarefs.lock().await.clone()
}
