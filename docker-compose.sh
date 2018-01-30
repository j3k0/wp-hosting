#!/bin/bash

. _scripts/base.sh

if test -e "$PROJECT/docker-compose.yml"; then
    cd "$PROJECT"
    shift
    if test -e docker-compose.override.yml; then
        VA="x$(< docker-compose.yml grep version || true)"
        VB="x$(< docker-compose.override.yml grep version || true)"
        if [ "$VA" == "$VB" ]; then
            exec docker-compose -f docker-compose.yml -f docker-compose.override.yml "$@"
        fi
    fi
    exec docker-compose -f docker-compose.yml "$@"
else
    echo "$PROJECT has no docker-compose.yml file"
    exit 1
fi
