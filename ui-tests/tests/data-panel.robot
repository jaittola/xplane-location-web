*** Settings ***
Documentation   Data panel content
Resource        keywords.resource
Library         Browser
Library         Process

*** Test Cases ***
IAS is 0 kn
    [Tags]              Data
    [Documentation]     Verify that Indicated Air Speed (IAS) is 0 before any input
    App is open
    Verify data value and unit  "Velocity (IAS)"  0  \ kn

TAS is 0 kn
    [Tags]              Data
    [Documentation]     Verify that True Air Speed (TAS) is 0 before any input
    App is open
    Verify data value and unit  "Velocity (TAS)"  0  \ kn

Heading is 0 °
    [Tags]              Data
    [Documentation]     Verify that magnetic heading is 0° before any input
    App is open
    Verify data value and unit  Heading (M)  0  \ °

Altitude is 0 ft
    [Tags]              Data
    [Documentation]     Verify that altitude is 0 ft before any input
    App is open
    Verify data value and unit  Altitude  0  \ ft

Latitude is unset
    [Tags]              Data
    [Documentation]     Verify that latitude is empty before any input
    App is open
    Get Text            text=Latitude >> .. >> .data-value  ==  ${SPACE}-${SPACE}

Longitude is unset
    [Tags]              Data
    [Documentation]     Verify that longitude is empty before any input
    App is open
    Get Text            text=Longitude >> .. >> .data-value  ==  ${SPACE}-${SPACE}

Gear is unset
    [Tags]              Data
    [Documentation]     Verify that gear up/down does not have a value before any input
    App is open
    Verify data value is unset  Gear

Parking brake is released
    [Tags]              Data
    [Documentation]     Verify that parking brake is released before any input
    App is open
    Get Text            text=Parking brake >> .. >> .data-value  ==  Released
    Get Element Count   text=Parking brake >> .. >> .data-unit  ==  0

Velocity is displayed as 50kn after sending a update
    [Tags]              Data
    App is open
    Send rref update    test_rref_24.bin
    Verify data value and unit  "Velocity (IAS)"  50  \ kn


*** Keywords ***
Verify data value and unit
    [Arguments]  ${title}  ${expected_value}  ${expected_unit}
    Get Text  text=${title} >> .. >> .data-value  ==  ${expected_value}
    Get Text  text=${title} >> .. >> .data-unit  ==  ${expected_unit}

Verify data value is unset
    [Arguments]  ${title}
    Get Text            text=${title} >> .. >> .data-value  ==  ${SPACE}-
    Get Element Count   text=${title} >> .. >> .data-unit  ==  0

Send rref update
    [Arguments]  ${filename}
    Run Process  nc  -4u  -w  1  ${UDP_TARGET_HOST}  ${UDP_TARGET_PORT}  stdin=${XPDIR}/rust-server/testdata/${filename}
