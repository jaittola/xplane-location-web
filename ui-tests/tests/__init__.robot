*** Settings ***
Documentation   Tests for xplane-location-web
Library         Process
Resource        keywords.resource
Suite Setup     Run xplane-location-web
Suite Teardown  Kill processes
