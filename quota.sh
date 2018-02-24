#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    echo -n "$PROJECT "
    echo $(sudo du -s ${PROJECT}/volumes/html ${PROJECT}/volumes/mysql | awk '{print $1}') | awk '{printf "%.0f M\n", ($1 + $2)/1024}'
else
    echo "ERROR: Project not initialized."
fi
