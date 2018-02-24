#!/bin/bash

. _scripts/base.sh
. _scripts/listBackups.sh

if [ "x$2" = "x" ]; then
    echo "Usage: $0 <project> <date>"
    echo
    echo "<date>: The timestamp of the backup to restore, in the format yyyyMMdd."
    listBackups $PROJECT
    exit 1
fi

if [ ! -e /backups/$PROJECT/backup_$2.tar.gz ]; then
    echo "Backup not found: /backups/$PROJECT/backup_$2.tar.gz"
    listBackups $PROJECT
    exit 1
fi

if test -e $PROJECT/docker-compose.yml; then
    docker exec ${APPNAME}_backup_1 restore $2
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
