#!/bin/bash

. _scripts/base.sh

if test -e "$PROJECT/docker-compose.yml"; then
    ./docker-compose.sh "$PROJECT" stop
    ./docker-compose.sh "$PROJECT" rm
    echo "rm docker-compose.yml"
    rm -f -- "$PROJECT/docker-compose.yml"
    echo "rm nginx config"
    rm -f "/etc/nginx/sites-enabled/$PROJECT"

    echo "You may now like to reload nginx:"
    echo
    echo "    service nginx reload"
    echo
fi
