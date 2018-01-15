#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    if ./docker-compose.sh $PROJECT ps wordpress db mail phpmyadmin sftp 2>/dev/null | grep Exit;
    then
        exit 1
    else
        exit 0
    fi
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
    exit 1
fi
