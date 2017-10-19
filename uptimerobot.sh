#!/bin/bash
# . _scripts/base.sh

if [ ! -e uptimerobot.yml ]; then
    echo "Please create uptimerobot.yml"
    exit 1
fi
API_KEY="$(cat uptimerobot.yml | grep api_key | cut -d: -f2 | sed 's/[ "]//g')"

ENDPOINT="$1"
if [ "x$2" != x ]; then
    EXTRA_ARGS="&$2"
fi

if [ "x$ENDPOINT" = x ] || [ "x$ENDPOINT" = "x--help" ]; then
    echo "Usage: $0 <endpoint> [extra_args]"
    echo
    echo "examples:"
    echo "    $0 getAccountDetails"
    echo "    $0 getMonitors 'logs=0&search=yabalesh.net'"
    exit 1
fi

curl -s -X POST -H "Content-Type: application/x-www-form-urlencoded" -H "Cache-Control: no-cache" -d "api_key=$API_KEY&format=json$EXTRA_ARGS" "https://api.uptimerobot.com/v2/$ENDPOINT" | jq .
