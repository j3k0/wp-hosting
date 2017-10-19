#!/bin/bash
. _scripts/base.sh

function join_by { local IFS="$1"; shift; echo "$*"; }

# DEBUG=YES

MONITOR_COUNT=`./uptimerobot.sh getMonitors search=$DOMAIN | jq --raw-output .pagination.total`

if [ x$DEBUG = xYES ]; then
    echo ./uptimerobot.sh getMonitors "search=$DOMAIN"
    ./uptimerobot.sh getMonitors "search=$DOMAIN"
fi

if [ "x$MONITOR_COUNT" = "x0" ]; then
    echo "Monitor doesn't exists, installing one."
    if [ x$DEBUG = xYES ]; then
        echo "./uptimerobot.sh getAlertContacts | jq --raw-output .alert_contacts[].id"
        ./uptimerobot.sh getAlertContacts
    fi
    ALERT_CONTACTS="$(./uptimerobot.sh getAlertContacts | jq --raw-output .alert_contacts[].id)"
    ALERT_CONTACTS="$(join_by - $ALERT_CONTACTS)"
    if [ x$DEBUG = xYES ]; then
        echo "./uptimerobot.sh newMonitor \"friendly_name=$PROJECT&url=https://$DOMAIN/wp-load.php&interval=300&alert_contacts=$ALERT_CONTACTS\""
    fi
    ./uptimerobot.sh newMonitor "type=1&friendly_name=$PROJECT&url=https://$DOMAIN/wp-load.php&interval=300&alert_contacts=$ALERT_CONTACTS"
    echo "Monitor installed"
else
    echo "Monitor already in place."
fi
