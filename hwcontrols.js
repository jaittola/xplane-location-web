const { spawnSync } = require('child_process')
const Epoll = require('epoll').Epoll
const fs = require('fs')
const { Buffer } = require('buffer');

const { debug, err } = require('./logs')

exports.setup = setup

// sudo dtoverlay rotary-encoder pin_a=14 pin_b=15 rollover=1
// relative=1 ?

var encoderFds = {}
var pushButtonFds = {}

var epo = undefined
var xplane = undefined

const inputEventSize = 16

function setup(udpreceive) {
    xplane = udpreceive

    process.on('exit', cleanup)

    epo = new Epoll(processEpoll)

    setupEncoder(14, 15, 'sim/autopilot/heading_up', 'sim/autopilot/heading_down')
    setupPushButton(18, 'sim/autopilot/heading_sync')
}

function setupEncoder(pinA, pinB, commandIncrease, commandDecrease) {
    runShellCommand(`sudo dtoverlay rotary-encoder pin_a=${pinA} pin_b=${pinB} relative_axis=1`)
    setupEncoderPolling(pinA, pinB, commandIncrease, commandDecrease, { retry: 4 })
}

function setupPushButton(pin, command) {
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
    pushButtonFds[fd] = { pin, command }
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

    const pushButton = pushButtonFds[fd]
    if (pushButton) {
        readPushButtonValue(fd, pushButton.command)
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

function readPushButtonValue(fd, command) {
    const buffer = Buffer.alloc(2)
    try {
        const read = fs.readSync(fd, buffer, 0, 2, 0)
        debug(`Read ${read} bytes from fd ${fd}: '${buffer.toString().trim()}'`)
        if (read > 0) {
            if (parseInt(buffer.toString()) == 0) {
                debug("Found 0, sending command")
                sendCommand(command)
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
    delete pushButtonFds[fd]
}

function cleanup() {
    err("Cleaning up")

    const pushButtonPins = Object.values(pushButtonFds).map(pb => pb.pin)

    Object.keys(encoderFds).forEach(fd => { removeFd(fd) })
    Object.keys(pushButtonFds).forEach(fd => { removeFd(fd) })

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
