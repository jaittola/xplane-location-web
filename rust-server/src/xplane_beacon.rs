use crate::channels::ChannelsController;
use crate::control_msgs::ControlMessages;
use binrw::{binrw, io::Cursor, BinReaderExt, BinResult, NullString};
use log::{debug, error, trace};
use net2::UdpBuilder;
use std::{
    io::{self},
    net::Ipv4Addr,
};

pub async fn receive_xplane_beacon(channels: ChannelsController) -> io::Result<()> {
    let mc_group = "239.255.1.1"
        .parse::<Ipv4Addr>()
        .map_err(|e| io::Error::other(e.to_string()))?;
    let mc_port = 49707;

    let sock = UdpBuilder::new_v4()?.reuse_address(true)?.bind(format!(
        "{}:{}",
        Ipv4Addr::UNSPECIFIED,
        mc_port
    ))?;
    sock.join_multicast_v4(&mc_group, &Ipv4Addr::UNSPECIFIED)?;
    sock.set_nonblocking(true)?;

    let tokio_socket = tokio::net::UdpSocket::from_std(sock)?;

    let mut buf = [0; 600];
    loop {
        trace!("Waiting for multicast traffic");
        tokio::select! {
            Ok((len, sender)) = tokio_socket.recv_from(&mut buf) => {
                trace!("Received {} bytes via multicast from {:?}", len, sender);
                if let Some(beacon) = decode_xplane_beacon_input(&mut buf) {
                    let addr = sender.ip();
                    debug!(
                        "Got XPlane beacon. XPlane is at {}:{}; computer '{}', version {}",
                        addr.to_string(),
                        beacon.port,
                        beacon.computer_name,
                        beacon.version_number
                    );
                    channels
                        .send_control(ControlMessages::XPlaneAddr {
                            addr,
                            port: beacon.port,
                        })
                        .await;
                }
            }
        }
    }
}

/*
Beacon:

uchar beacon_major_version;         // 1 at the time of X-Plane 10.40
uchar beacon_minor_version;         // 1 at the time of X-Plane 10.40
xint application_host_id;           // 1 for X-Plane, 2 for PlaneMaker
xint version_number;                // 104103 for X-Plane 10.41r3
uint role;                          // 1 for master, 2 for extern visual, 3 for IOS
ushort port;                        // port number X-Plane is listening on, 49000 by default
xchr computer_name[500];            // the hostname of the computer, e.g. “Joe’s Macbook”
 */

#[derive(Debug)]
#[binrw]
#[brw(little, magic = b"BECN\0")]
struct Beacon {
    major_version: u8,
    minor_version: u8,
    application_host_id: i32,
    version_number: i32,
    role: u32,
    port: u16,
    #[brw(pad_size_to = 500)]
    computer_name: NullString,
}

fn decode_xplane_beacon_input(buf: &mut [u8]) -> Option<Beacon> {
    trace!("Content from multicast: {:?}", buf);

    let mut reader = Cursor::new(buf);

    let resu: BinResult<Beacon> = reader.read_ne();
    match resu {
        Ok(beacon) => {
            debug!("Got beacon {:?}", beacon);
            Some(beacon)
        }
        Err(e) => {
            error!("Parsing multicast beacon input failed: {:?}", e);
            None
        }
    }
}

#[cfg(test)]
mod xplane_beacon_tests {
    use binrw::{io::Cursor, BinWrite, NullString};
    use std::fs::File;
    use std::io::prelude::*;

    use super::{decode_xplane_beacon_input, Beacon};

    fn testbeacon() -> Beacon {
        Beacon {
            major_version: 1,
            minor_version: 1,
            application_host_id: 1,
            version_number: 12101,
            role: 1,
            port: 49000,
            computer_name: NullString::from("Just testing"),
        }
    }

    #[test]
    fn test_create_beacon_data() {
        let mut writer = Cursor::new(Vec::new());
        testbeacon().write(&mut writer).unwrap();
        let bytes = writer.get_ref();

        let mut output_file = File::create("beacon-testinput.bin").unwrap();
        output_file.write_all(bytes).unwrap();
        output_file.flush().unwrap();
    }

    #[test]
    fn test_create_and_parse_beacon_data() {
        let mut writer = Cursor::new(Vec::new());
        testbeacon().write(&mut writer).unwrap();
        let mut bytes = writer.get_mut();

        let r = decode_xplane_beacon_input(&mut bytes).unwrap();
        assert_eq!(r.port, 49000);
        assert_eq!(r.computer_name.to_string(), "Just testing");
    }
}
