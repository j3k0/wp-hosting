#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    shift
    echo ./docker-compose.sh "$PROJECT" logs "$@"
    ./docker-compose.sh "$PROJECT" logs "$@"
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
