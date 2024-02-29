#!/usr/bin/env bash -xe

python3 -m venv .venv
. ./.venv/bin/activate

pip install robotframework
pip install robotframework-browser

rfbrowser init
