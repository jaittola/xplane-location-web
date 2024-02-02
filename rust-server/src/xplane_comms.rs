use std::io;

use tokio::net::UdpSocket;

pub async fn run_comms() -> io::Result<()> {
    let sock = UdpSocket::bind(":::49008").await?;

    let mut buf = [0; 4096];

    loop {
        let (len, addr) = sock.recv_from(&mut buf).await?;
        println!("{} bytes received from {:?}", len, addr);
        handle_input(&mut buf[..len]).await
    }
}

async fn handle_input(buf: &mut [u8]) {
    println!("Content: {:?}", buf);
}
