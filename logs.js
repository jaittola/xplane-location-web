
const debugging = !!process.env['DEBUG'] || false

function debug(...args) {
    if (debugging) {
        console.log(...args)
    }
}

function err(...args) {
    console.error(...args)
}

exports.debug = debug
exports.err = err

