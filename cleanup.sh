#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    cd $PROJECT
    docker-compose stop
    docker-compose rm
    echo "rm docker-compose.yml"
    rm -f docker-compose.yml
fi
