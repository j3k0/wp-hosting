#!/bin/bash

. _scripts/base.sh

if test -e "$PROJECT/docker-compose.yml"; then
    docker exec "${APPNAME}_backup_1" backup
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
