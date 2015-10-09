#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    cd $PROJECT
    docker-compose logs
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
