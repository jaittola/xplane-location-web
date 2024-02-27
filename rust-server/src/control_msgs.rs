use std::net::IpAddr;

#[derive(Debug, Clone)]
pub enum ControlMessages {
    XPlaneAddr { addr: IpAddr, port: u16 },
}
