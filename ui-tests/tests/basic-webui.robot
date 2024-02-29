*** Settings ***
Documentation   Basic web-ui tests for xplane-location-web
Resource        keywords.resource
Library         Browser

*** Test Cases ***
Open UI and check controls are shown
    [Documentation]    Checks that the UI can be open and correct items are on screen
    [Tags]             Smoke
    App is open
    Data panel is shown
    Map is not shown
    Controls are shown

Open Map view page and check map is shown
    [Documentation]    Checks that the map is shown on the map view
    [Tags]             Smoke
    Map view is open
    Data Panel is shown
    Map is shown
    Controls are not shown

Navigate from controls to map view
    [Documentation]    On clicking the "show map" link, navigate to map
    App is open
    Click  "Show map"
    Get Url  ==  ${URL}map.html
    Click  "Show controls"
    Get Url  ==  ${URL}

Navigate from map to controls
    [Documentation]    On clicking the "show map" link, navigate to map
    Map view is open
    Click  "Show controls"
    Get Url  ==  ${URL}
