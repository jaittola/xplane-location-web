#!/usr/bin/env bash -xe

. ./.venv/bin/activate

mkdir -p output

robot --outputdir=output --variablefile=variables/local-chromium.py "$@" tests
