#!/bin/bash

. _scripts/base.sh

function list() {
    echo
    echo "Available backups:"
    ls -1 $PROJECT/backups|cut -d_ -f2|cut -d. -f1|sort|uniq
    echo
}

if [ "x$2" = "x" ]; then
    echo "Usage: $0 <project> <date>"
    echo
    echo "<date>: The timestamp of the backup to restore, in the format yyyyMMdd."
    list
    exit 1
fi

if [ ! -e $PROJECT/backups/backup_$2.tar.gz ]; then
    echo "Backup not found: $PROJECT/backups/backup_$2.tar.gz"
    list
    exit 1
fi

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    docker exec ${APPNAME}_backup_1 restore $2
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
