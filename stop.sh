#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    ./docker-compose.sh $PROJECT stop
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
