#!/bin/bash

. _scripts/base.sh

echo "$PROJECT ... ${STATE:-ENABLED}"
if [ "x$STATE" == "xDISABLED" ]; then
    echo "$PROJECT ..."
    ./docker-compose.sh "$PROJECT" down -v
    rm -f "/etc/nginx/sites-enabled/$PROJECT"
else
    ./docker-compose.sh "$PROJECT" up -d
    if test ! -e "/etc/nginx/sites-enabled/$PROJECT"; then
        ln -s "$(pwd)/$PROJECT/nginx-site" "/etc/nginx/sites-enabled/$PROJECT"
    fi
fi
