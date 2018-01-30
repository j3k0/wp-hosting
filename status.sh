#!/bin/bash

set -e
. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    ./docker-compose.sh $PROJECT ps wordpress db phpmyadmin sftp backup 2>/dev/null > /tmp/ps.txt
    if cat /tmp/ps.txt | grep Exit > /dev/null; then
        echo "DOWN: $PROJECT Stopped"
        exit 1
    fi
    if [ `cat /tmp/ps.txt | grep Up | wc -l` != 5 ]; then
        echo "DOWN: $PROJECT Not started"
        exit 1
    fi
    echo "UP: $PROJECT"
    exit 0
else
    echo "ERROR: $PROJECT has no docker-compose.yml file. Project not initialized."
    exit 1
fi
