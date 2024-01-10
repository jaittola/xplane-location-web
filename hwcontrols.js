const { exec, spawnSync } = require('child_process')
const Epoll = require('epoll').Epoll
const fs = require('fs')
const { Buffer } = require('buffer');

exports.setup = setup

// sudo dtoverlay rotary-encoder pin_a=14 pin_b=15 rollover=1
// relative=1 ?

var encoderFds = {}
var epo = undefined
var xplane = undefined

const inputEventSize = 16

function setup(udpreceive) {
    xplane = udpreceive

    process.on('exit', cleanup)

    epo = new Epoll(processEpoll)

    setupEncoder(14, 15, 'sim/autopilot/heading_up', 'sim/autopilot/heading_down')
}

function setupEncoder(pinA, pinB, commandIncrease, commandDecrease) {
    runShellCommand(`sudo dtoverlay rotary-encoder pin_a=${pinA} pin_b=${pinB} relative_axis=1`)
    setupEncoderPolling(pinA, pinB, commandIncrease, commandDecrease, { retry: 4 })
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
            console.log(`Setting up encoder for pins ${pinA} and ${pinB} failed: ${error}`)
        }

        return
    }
}

function processEpoll(err, fd, events) {
    if (err) {
        console.log(`Epoll for fd ${fd} failed: ${err}`)
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
}

function handleEncoderInput(encoder, type, code, value) {
    if (type === 2 /* EV_REL */ && code == 0 /* REL_X */) {
        let cmd = undefined
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
        console.log(`Reading from FD ${fd} failed: ${error}`)
        removeFd(fd)
        return undefined
    }

    const type = buffer.readUInt16LE(8)
    const code = buffer.readUInt16LE(10)
    const value = buffer.readInt32LE(12)

    return { type, code, value }
}

function removeFd(fd) {
    delete encoderFds[fd]
    epo?.remove(fd)
    fs.close(fd)
}

function cleanup() {
    console.log("Cleaning up")

    Object.keys(encoderFds).forEach(fd => {
        removeFd(fd)
    })

    epo?.close()

    runShellCommand('sudo dtoverlay -R', { ignoreError: true })

    console.log("Clean-up done")
}

function runShellCommand(cmd, options) {
    const { error, stderr } = spawnSync(cmd, { shell: true })
    if (error) {
        console.log(`spawnSync error: ${error}`);
        if (stderr) {
            console.log("stderr output:", stderr)
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
