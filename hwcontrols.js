const { spawnSync } = require('child_process')
const Epoll = require('epoll').Epoll
const fs = require('fs')
const { Buffer } = require('buffer');

const { debug, err } = require('./logs')

exports.setup = setup

// sudo dtoverlay rotary-encoder pin_a=14 pin_b=15 rollover=1
// relative=1 ?

var encoderFds = {}
var switchFds = {}

var epo = undefined
var xplane = undefined

const inputEventSize = 16

function setup(udpreceive) {
    xplane = udpreceive

    process.on('exit', cleanup)

    epo = new Epoll(processEpoll)

    configureControls()
}

function configureControls() {

    //  crs (rotary) 23,24   | ap hdg (rotary)  14,15 | ap alt (rotary) 25,8  | ap vs (rotary) 7,1 | ap hdg (btn) 27
    //                         ap hdg sync (but) 18   | ap alt sync (but) 27
    // --------------------------------------------------------------------------------------------
    //  gps c/n coarse 12,16 | gps c/n fine 20,21     | gps chapter (rot) 2,3 | gps page (rot) 4,17


    // crs:            GPIO 23, 24; pins 16, 18   GNDPIN 14  sim/autopilot/hsi_select_down | hsi_select_up
    // ap hdg:         GPIO 14, 15; pins  8, 10   GNDPIN 6   sim/autopilot/heading_down | up
    // ap hdg sync:    GPIO     18; pins 12                  sim/autopilot/heading_sync
    // ap alt:         GPIO 25,  8; pins 22, 24   GNDPIN 20  sim/autopilot/altitude_down | up
    // ap alt sync     GPIO     27; pins     13              sim/autopilot/altitude_sync
    // ap vs:          GPIO  7,  1: pins 26, 28   GNDPIN 30  sim/autopilot/vertical_speed_down | up
    // ap hdg:         GPIO     22: pins     15   GNDPIN ?   sim/autopilot/heading
    // gps c/n coarse: GPIO 12, 16: pins 32, 36   GNDPIN 34  sim/GPS/g430n1_coarse_down | up
    // gps c/n fine:   GPIO 20, 21: pins 38, 40   GNDPIN 39  sim/GPS/g430n1_fine_down | up
    // gps chapter:    GPIO  2,  3: pins  3,  5   GNDPIN 9   sim/GPS/g430n1_chapter_down | up
    // gps page:       GPIO  4, 17: pins  7, 11   GNDPIN 25  sim/GPS/g430n1_page_down | up
    // switch          GPIO     26: pins     37   GNDPIN 39  sim/lights/landing_lights_off | on

    setupEncoder(24, 23, 'sim/radios/obs1_down', 'sim/radios/obs1_up')
    setupEncoder(15, 14, 'sim/autopilot/heading_down', 'sim/autopilot/heading_up')
    setupPushButton(18, 'sim/autopilot/heading_sync')
    setupEncoder(8, 25, 'sim/autopilot/altitude_down', 'sim/autopilot/altitude_up')
    setupPushButton(27, 'sim/autopilot/altitude_sync')
    setupEncoder(1, 7, 'sim/autopilot/vertical_speed_down', 'sim/autopilot/vertical_speed_up')
    setupEncoder(16, 12, 'sim/GPS/g430n1_coarse_down', 'sim/GPS/g430n1_coarse_up')
    setupEncoder(21, 20, 'sim/GPS/g430n1_fine_down', 'sim/GPS/g430n1_fine_up')
    setupEncoder(3, 2, 'sim/GPS/g430n1_chapter_down', 'sim/GPS/g430n1_chapter_up')
    setupEncoder(17, 4, 'sim/GPS/g430n1_page_down', 'sim/GPS/g430n1_page_up')
    setupSwitch(26, { onLow: 'sim/lights/landing_lights_off',
                      onHigh: 'sim/lights/landing_lights_on'})
}

function configureControlsForTest() {
    setupEncoder(14, 15, 'sim/autopilot/heading_up', 'sim/autopilot/heading_down')
    setupPushButton(18, 'sim/autopilot/heading_sync')
    setupSwitch(23, { onLow: 'sim/lights/landing_lights_off',
                      onHigh: 'sim/lights/landing_lights_on'})
}

function setupEncoder(pinA, pinB, commandIncrease, commandDecrease) {
    runShellCommand(`sudo dtoverlay rotary-encoder pin_a=${pinA} pin_b=${pinB} relative_axis=1`)
    setupEncoderPolling(pinA, pinB, commandIncrease, commandDecrease, { retry: 4 })
}

function setupPushButton(pin, command) {
    setupSwitch(pin, { onLow: command })
}

function setupSwitch(pin, commands) {
    const gpiodir = `/sys/class/gpio/gpio${pin}`

    runShellCommand(`echo ${pin} > /sys/class/gpio/unexport`)

    // Note: one should not be doing this since expecting the gpio
    // line to stay configured after gpioset exits is undefined
    // behavior. But, as all the Raspi Node gpio libs seem to be
    // somewhat shitty, I don't want to use them. This is a quick hack
    // to see if I can get this working.
    runShellCommand(`sudo gpioset -B pull-up 0 ${pin}=1`)

    runShellCommand(`echo ${pin} > /sys/class/gpio/export`)
    runShellCommand(`echo 'in' > ${gpiodir}/direction`)

    const fd = fs.openSync(`${gpiodir}/value`, 'r')
    switchFds[fd] = { pin, ...commands }
    epo.add(fd, Epoll.EPOLLPRI | Epoll.EPOLLERR)

    // I have no idea why setting the edge has to be run after a delay,
    // but it doesn't have any effect otherwise.
    setTimeout(() => {
        runShellCommand(`echo 'both' > ${gpiodir}/edge`)
    }, 500)
}

function setupEncoderPolling(pinA, pinB, commandIncrease, commandDecrease, retryOptions) {
    try {
        const fd = fs.openSync(encoderFileName(pinA), 'r')
        encoderFds[fd] = { inc: commandIncrease, dec: commandDecrease }
        epo.add(fd, Epoll.EPOLLIN)
    } catch (error) {
        if (error?.code === 'ENOENT' &&
            (retryOptions.retryCount === undefined ||
             retryOptions.retryCount < retryOptions.retry)) {
            setTimeout(() => {
                setupEncoderPolling(pinA, pinB, commandIncrease, commandDecrease,
                                    { ...retryOptions,
                                      retryCount: (retryOptions.retryCount ?? 0) + 1
                                    })
            }, 500)
        } else {
            err(`Setting up encoder for pins ${pinA} and ${pinB} failed: ${error}`)
        }

        return
    }
}

function processEpoll(err, fd, events) {
    debug(`Process poll for ${fd}, ${events}`)

    if (err) {
        err(`Epoll for fd ${fd} failed: ${err}`)
        removeFd(fd)
        return
    }

    const encoder = encoderFds[fd]
    if (encoder) {
        const ev = readInputEvent(fd)
        if (ev) {
            const { type, code, value } = ev
            handleEncoderInput(encoder, type, code, value)
        }
    }

    const switchConfig = switchFds[fd]
    if (switchConfig) {
        readSwitchValue(fd, switchConfig)
    }
}

function handleEncoderInput(encoder, type, code, value) {
    if (type === 2 /* EV_REL */ && code == 0 /* REL_X */) {
        switch (value) {
        case 1:
            sendCommand(encoder.inc)
            break
        case -1:
            sendCommand(encoder.dec)
            break
        default:
            break
        }
    }
}

function readInputEvent(fd) {
    const buffer = Buffer.alloc(inputEventSize)

    try {
        const read = fs.readSync(fd, buffer, 0, inputEventSize)
        if (read != inputEventSize) {
            removeFd(fd)
            return undefined
        }
    } catch (error) {
        err(`Reading from FD ${fd} failed: ${error}`)
        removeFd(fd)
        return undefined
    }

    const type = buffer.readUInt16LE(8)
    const code = buffer.readUInt16LE(10)
    const value = buffer.readInt32LE(12)

    return { type, code, value }
}

function readSwitchValue(fd, switchConfig) {
    const buffer = Buffer.alloc(2)
    try {
        const read = fs.readSync(fd, buffer, 0, 2, 0)
        debug(`Read ${read} bytes from fd ${fd}: '${buffer.toString().trim()}'`)
        if (read > 0) {
            const val = parseInt(buffer.toString())
            switch (val) {
            case 0:
                if (switchConfig.onLow) {
                    debug("Found 0, sending command")
                    sendCommand(switchConfig.onLow)
                }
                break
            case 1:
                if (switchConfig.onHigh) {
                    debug("Found 1, sending command")
                    sendCommand(switchConfig.onHigh)
                }
                break
            default:
                err("Got unknown value from switch", val)
                break
            }
        }
        else {
            removeFd(fd)
        }
    } catch (error) {
        err(`Reading from push button fd ${fd} failed: ${error}`)
        removeFd(fd)
    }
}

function removeFd(fd) {
    try {
        const numfd = parseInt(fd)
        debug(`Removing fd ${numfd}`)
        epo?.remove(numfd)
        fs.close(numfd)
    } catch (error) {
        err(`Removing fd ${fd} failed: ${error}`)
    }

    delete encoderFds[fd]
    delete switchFds[fd]
}

function cleanup() {
    err("Cleaning up")

    const pushButtonPins = Object.values(switchFds).map(pb => pb.pin)

    Object.keys(encoderFds).forEach(fd => { removeFd(fd) })
    Object.keys(switchFds).forEach(fd => { removeFd(fd) })

    epo?.close()

    runShellCommand('sudo dtoverlay -R', { ignoreError: true })

    pushButtonPins.forEach(pin => {
        runShellCommand(`echo ${pin} > /sys/class/gpio/unexport`)
    })

    debug("Clean-up done")
}

function runShellCommand(cmd, options) {
    const { error, stderr } = spawnSync(cmd, { shell: true })
    if (error) {
        err(`spawnSync error: ${error}`);
        if (stderr) {
            err("stderr output:", stderr)
        }
        if (options?.ignoreErrors !== true) {
            process.exit(1)
        }
    }
}

function encoderFileName(pinA) {
    return `/dev/input/by-path/platform-rotary@${pinA.toString(16)}-event`
}

function sendCommand(commandStr) {
    xplane.command({ command: commandStr })
}
