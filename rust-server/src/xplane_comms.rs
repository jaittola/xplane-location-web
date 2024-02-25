pub use crate::xpc_types::ReceivedDatarefs;
use crate::{channels::ChannelsXPlaneCommEndpoint, xpc_types::UICommand};
use binrw::{binrw, io::Cursor, BinReaderExt, BinResult, BinWrite, NullString};
use log::{debug, error, info};
use std::{
    io::{self},
    sync::Arc,
    time::Duration,
};
use tokio::{
    net::UdpSocket,
    time::{interval, sleep},
};

pub async fn run_xplane_udp(port: u16, channels: ChannelsXPlaneCommEndpoint) -> io::Result<()> {
    let xp_addr = "192.168.1.102:49000";

    let addr = format!("0.0.0.0:{}", port);
    let sock = UdpSocket::bind(addr).await?;

    let receive = Arc::new(sock);
    let send = receive.clone();

    let mut buf = [0; 4096];

    let mut dataref_cache = ReceivedDatarefs {
        ..Default::default()
    };

    let ChannelsXPlaneCommEndpoint {
        mut control,
        datarefs,
        mut ui_cmds,
        ..
    } = channels;

    let mut dataref_timer = interval(Duration::from_secs(30));

    loop {
        tokio::select! {
            Ok((len, _)) = receive.recv_from(&mut buf) => {
                handle_input(&mut buf[..len], &mut dataref_cache).await;
                datarefs.send(dataref_cache.clone()).await.ok();
            },
            Ok(_) = control.recv() => { },
            Some(cmd) = ui_cmds.recv () => {
                 debug!("Received command from UI: {:?}", cmd);
                send_cmd(send.clone(), xp_addr, cmd).await;
            },
            _ = dataref_timer.tick() =>  {
                request_datarefs(send.clone(), xp_addr).await;
            }
        }
    }
}

async fn request_datarefs(sock: Arc<UdpSocket>, xp_addr: &str) {
    let target = String::from(xp_addr);

    tokio::spawn(async move {
        for (i, dref_identity) in RREF_IDENTITIES.iter().enumerate() {
            let index = (i + 1) as u32;
            let request = RrefRequest {
                freq: 3,
                index,
                name: dref_identity.name.into(),
            };

            let mut writer = Cursor::new(Vec::new());
            request.write(&mut writer).unwrap();
            let bytes = writer.into_inner();

            assert_eq!(bytes.len(), 413);

            send_to_xp(sock.clone(), &target, bytes).await;
            sleep(Duration::from_millis(20)).await;
        }
    });
}

async fn send_cmd(sock: Arc<UdpSocket>, xp_addr: &str, command: UICommand) {
    let xp_cmd = XPlaneCmd {
        command: command.command.into(),
    };
    let mut writer = Cursor::new(Vec::new());
    xp_cmd.write(&mut writer).unwrap();
    let bytes = writer.into_inner();

    debug!("Sending command {:#?} to XPlane at {}", xp_cmd, xp_addr);

    send_to_xp(sock, xp_addr, bytes).await;
}

async fn send_to_xp(sock: Arc<UdpSocket>, xp_addr: &str, bytes: Vec<u8>) {
    match sock.send_to(&bytes, xp_addr).await {
        Ok(len) => debug!("Wrote {} bytes to XPlane at {}", len, xp_addr),
        Err(e) => error!("Writing RREF message to {} failed: {:?}", xp_addr, e),
    }
}

enum RrefIdentifier {
    HasRetractingGear,
    IsGearUnsafe,
    IsGearHandleDown,
    AvionicsPower,
    NavigationLights,
    Beacon,
    StrobeLights,
    TaxiLights,
    LandingLights0,
    LandingLights1,
    PitotHeat1,
    PitotHeat2,
    StallWarningHeat,
    PropHeat,
    WindowHeat,
    AutopilotFlightDirectorMode,
    AutopilotHeadingMode,
    AutopilotAltHoldMode,
    AutopilotApproachMode,
    AutopilotNavMode,
    AutopilotBackCourseMode,
    YawDamper,
    ParkingBrakeRatio,
    IAS,
    TAS,
    MagHeading,
    Altitude,
    Lat,
    Lon,
}

struct DatarefIdentity {
    id: RrefIdentifier,
    name: &'static str,
}

static RREF_IDENTITIES: &'static [DatarefIdentity] = &[
    DatarefIdentity {
        id: RrefIdentifier::HasRetractingGear,
        name: "sim/aircraft/gear/acf_gear_retract",
    },
    DatarefIdentity {
        id: RrefIdentifier::IsGearUnsafe,
        name: "sim/cockpit2/annunciators/gear_unsafe",
    },
    DatarefIdentity {
        id: RrefIdentifier::IsGearHandleDown,
        name: "sim/cockpit2/controls/gear_handle_down",
    },
    DatarefIdentity {
        id: RrefIdentifier::AvionicsPower,
        name: "sim/cockpit2/switches/avionics_power_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::NavigationLights,
        name: "sim/cockpit2/switches/navigation_lights_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::Beacon,
        name: "sim/cockpit2/switches/beacon_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::StrobeLights,
        name: "sim/cockpit2/switches/strobe_lights_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::TaxiLights,
        name: "sim/cockpit2/switches/taxi_light_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::LandingLights0,
        name: "sim/cockpit2/switches/landing_lights_switch[0]",
    },
    DatarefIdentity {
        id: RrefIdentifier::LandingLights1,
        name: "sim/cockpit2/switches/landing_lights_switch[1]",
    },
    DatarefIdentity {
        id: RrefIdentifier::PitotHeat1,
        name: "sim/cockpit2/ice/ice_pitot_heat_on_pilot",
    },
    DatarefIdentity {
        id: RrefIdentifier::PitotHeat2,
        name: "sim/cockpit2/ice/ice_pitot_heat_on_copilot",
    },
    DatarefIdentity {
        id: RrefIdentifier::StallWarningHeat,
        name: "sim/cockpit2/ice/ice_AOA_heat_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::PropHeat,
        name: "sim/cockpit2/ice/ice_prop_heat_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::WindowHeat,
        name: "sim/cockpit2/ice/ice_window_heat_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotFlightDirectorMode,
        name: "sim/cockpit2/autopilot/flight_director_mode",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotHeadingMode,
        name: "sim/cockpit2/autopilot/heading_mode",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotAltHoldMode,
        name: "sim/cockpit2/autopilot/altitude_hold_status",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotApproachMode,
        name: "sim/cockpit2/autopilot/glideslope_armed",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotNavMode,
        name: "sim/cockpit2/autopilot/hnav_armed",
    },
    DatarefIdentity {
        id: RrefIdentifier::AutopilotBackCourseMode,
        name: "sim/cockpit2/autopilot/backcourse_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::YawDamper,
        name: "sim/cockpit2/switches/yaw_damper_on",
    },
    DatarefIdentity {
        id: RrefIdentifier::ParkingBrakeRatio,
        name: "sim/cockpit2/controls/parking_brake_ratio",
    },
    DatarefIdentity {
        id: RrefIdentifier::IAS,
        name: "sim/cockpit2/gauges/indicators/airspeed_kts_pilot",
    },
    DatarefIdentity {
        id: RrefIdentifier::TAS,
        name: "sim/cockpit2/gauges/indicators/ground_speed_kts",
    },
    DatarefIdentity {
        id: RrefIdentifier::MagHeading,
        name: "sim/cockpit2/gauges/indicators/compass_heading_deg_mag",
    },
    DatarefIdentity {
        id: RrefIdentifier::Altitude,
        name: "sim/cockpit2/gauges/indicators/altitude_ft_pilot",
    },
    DatarefIdentity {
        id: RrefIdentifier::Lat,
        name: "sim/flightmodel/position/latitude",
    },
    DatarefIdentity {
        id: RrefIdentifier::Lon,
        name: "sim/flightmodel/position/longitude",
    },
];

#[derive(Debug)]
#[binrw]
#[br(little)]
enum IncomingMsg {
    #[br(magic = b"DATA")]
    DataMsg {
        #[br(count = 9)]
        values: Vec<u32>,
    },
    #[br(magic = b"RREF")]
    RrefMsg {
        #[br(pad_before = 1, parse_with = parse_drefvalues)]
        values: Vec<DatarefValue>,
    },
}

#[derive(Debug)]
#[binrw]
#[br(little)]
struct DatarefValue {
    id: u32,
    value: f32,
}

#[derive(Debug)]
#[binrw]
#[brw(little, magic = b"RREF\0")]
struct RrefRequest {
    freq: u32,
    index: u32,
    #[brw(pad_size_to = 400)]
    name: NullString,
}

#[derive(Debug)]
#[binrw]
#[brw(little, magic = b"CMND0")]
struct XPlaneCmd {
    command: NullString,
}

#[binrw::parser(reader)]
fn parse_drefvalues() -> BinResult<Vec<DatarefValue>> {
    let mut datarefs = Vec::new();

    loop {
        let resu: BinResult<DatarefValue> = reader.read_ne();
        match resu {
            Ok(v) => datarefs.push(v),
            Err(_) => break,
        }
    }

    Ok(datarefs)
}

async fn handle_input(buf: &mut [u8], dataref_cache: &mut ReceivedDatarefs) {
    debug!("Content: {:?}", buf);

    let mut reader = Cursor::new(buf);

    loop {
        let resu: BinResult<IncomingMsg> = reader.read_ne();
        match resu {
            Ok(IncomingMsg::DataMsg { values }) => {
                info!("Got datamsg {:?}", values)
            }
            Ok(IncomingMsg::RrefMsg { values }) => {
                debug!("Dataref values {:?}", values);
                handle_datarefs(&values, dataref_cache);
            }
            Err(_) => break,
        }
    }

    debug!("Dataref cache: {:?}", dataref_cache);
}

fn handle_datarefs(values: &Vec<DatarefValue>, dataref_cache: &mut ReceivedDatarefs) {
    for v in values {
        handle_dataref(v.id, v.value, dataref_cache);
    }
}

fn handle_dataref(id: u32, value: f32, datarefs: &mut ReceivedDatarefs) {
    debug!("Got dataref {} = {:?}", id, value);

    if id == 0 || id > RREF_IDENTITIES.len() as u32 {
        error!("Got dataref with id outside the known values: {}", id);
        return;
    }

    let identity = &RREF_IDENTITIES[(id - 1) as usize];

    match identity.id {
        RrefIdentifier::HasRetractingGear => datarefs.has_retracting_gear = boolv(value),
        RrefIdentifier::IsGearUnsafe => datarefs.is_gear_unsafe = boolv(value),
        RrefIdentifier::IsGearHandleDown => datarefs.is_gear_handle_down = boolv(value),
        RrefIdentifier::AvionicsPower => datarefs.avionics_power = boolv(value),
        RrefIdentifier::NavigationLights => datarefs.navigation_lights = boolv(value),
        RrefIdentifier::Beacon => datarefs.beacon = boolv(value),
        RrefIdentifier::StrobeLights => datarefs.strobe_lights = boolv(value),
        RrefIdentifier::TaxiLights => datarefs.taxi_lights = boolv(value),
        RrefIdentifier::ParkingBrakeRatio => datarefs.parking_brake = boolv_with_limit(value, 0.1),
        RrefIdentifier::LandingLights0 => datarefs.landing_lights_1 = boolv(value),
        RrefIdentifier::LandingLights1 => datarefs.landing_lights_2 = boolv(value),
        RrefIdentifier::PitotHeat1 => datarefs.pitot_heat_1 = boolv(value),
        RrefIdentifier::PitotHeat2 => datarefs.pitot_heat_2 = boolv(value),
        RrefIdentifier::StallWarningHeat => datarefs.stall_warn_heat = boolv(value),
        RrefIdentifier::PropHeat => datarefs.prop_heat = boolv(value),
        RrefIdentifier::WindowHeat => datarefs.window_heat = boolv(value),
        RrefIdentifier::AutopilotFlightDirectorMode => parse_flight_director_mode(datarefs, value),
        RrefIdentifier::AutopilotHeadingMode => datarefs.autopilot_heading_mode = boolv(value),
        RrefIdentifier::AutopilotAltHoldMode => datarefs.autopilot_alt_hold_mode = boolv(value),
        RrefIdentifier::AutopilotApproachMode => datarefs.autopilot_approach_mode = boolv(value),
        RrefIdentifier::AutopilotNavMode => datarefs.autopilot_nav_mode = boolv(value),
        RrefIdentifier::AutopilotBackCourseMode => {
            datarefs.autopilot_back_course_mode = boolv(value)
        }
        RrefIdentifier::YawDamper => datarefs.yaw_damper = boolv(value),
        RrefIdentifier::IAS => datarefs.ias = value,
        RrefIdentifier::TAS => datarefs.tas = value,
        RrefIdentifier::MagHeading => datarefs.mag_heading = value,
        RrefIdentifier::Altitude => datarefs.altitude = value,
        RrefIdentifier::Lat => datarefs.lat = value,
        RrefIdentifier::Lon => datarefs.lon = value,
    }
}

fn boolv(v: f32) -> bool {
    v != 0f32
}

fn boolv_with_limit(v: f32, limit: f32) -> bool {
    v > limit
}

fn parse_flight_director_mode(datarefs: &mut ReceivedDatarefs, value: f32) {
    datarefs.autopilot_flight_director = value > 0f32;
    datarefs.autopilot_engaged = value >= 2f32;
}
