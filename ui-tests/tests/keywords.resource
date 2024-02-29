*** Keywords ***
App is open
    New Page   ${URL}

Map view is open
    New Page   ${URL}/map.html

Data panel is shown
    Get Element Count  .data-panel  ==  1
    Get Style  .data-panel  display  ==  block

Controls are not shown
    Get Element Count  \#controls  ==  0

Controls are shown
    Get Style  \#controls  display == block

Map is shown
    Get Style  \#map  display  ==  block

Map is not shown
    Get Element Count  \#map  ==  0

Run xplane-location-web
    Start Process  ${XPDIR}/rust-server/target/debug/xplane-location-web  -w  ${XPDIR}/www  -l  info

Kill processes
    Terminate All Processes
