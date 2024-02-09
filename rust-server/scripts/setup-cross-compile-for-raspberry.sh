#!/usr/bin/env bash

mkdir ./.cargo || true
cat > ./.cargo/config <<EOF
[target.arm-unknown-linux-musleabihf]
linker = "arm-linux-gnueabihf-ld"
EOF

rustup target add arm-unknown-linux-musleabihf

case `uname` in
    Darwin)
        brew install arm-linux-gnueabihf-binutils
        ;;
    Linux)
        sudo apt install -y gcc-arm-linux-gnueabihf
        ;;
    *)
        echo "Unknown platform"
        exit 1
        ;;
esac
