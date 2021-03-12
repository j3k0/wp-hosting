#!/bin/bash

. _scripts/base.sh

if test -e "$PROJECT/docker-compose.yml"; then
    cd "$PROJECT"
    if [ "x$STATE" == "xENABLED" ]; then
        docker-compose up -d
        docker exec "${APPNAME}_backup_1" backup
    fi
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
