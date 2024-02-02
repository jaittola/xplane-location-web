mod xplane_comms;

use warp::Filter;

pub use crate::xplane_comms::run_comms;

#[tokio::main]
async fn main() {
    tokio::spawn(async {
        if let Err(err) = run_comms().await {
            eprintln!("Running the UDP communication failed: {:?}", err);
        }
    });

    run_webserver().await;
}

async fn run_webserver() {
    let readme = warp::path("readme").map(|| "Boom, readme");
    let static_files = warp::any().and(warp::fs::dir("../www"));
    let routes = readme.or(static_files);

    warp::serve(routes).run(([0, 0, 0, 0], 3002)).await
}
