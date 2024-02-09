#!/usr/bin/env bash

cargo build --target arm-unknown-linux-musleabihf "${@:1}"
