#!/bin/bash
cd "$(dirname "$0")"
. _scripts/base.sh
. _scripts/listBackups.sh

if [ "x$2" = "x" ]; then
    echo "Usage: $0 <project> <date>"
    echo
    echo "<date>: The timestamp of the backup to restore, in the format yyyyMMdd-HHmmss."
    listBackups $PROJECT
    exit 0
fi

# Extract just the date part for the backup file name
BACKUP_DATE="${2%%-*}"
BACKUP_FILE="/backups/$PROJECT/backup_$2.tar.gz"

if [ ! -e "$BACKUP_FILE" ]; then
    echo "Backup not found: $BACKUP_FILE"
    listBackups $PROJECT
    exit 1
fi

if test -e $PROJECT/docker-compose.yml; then
    docker exec ${APPNAME}_backup_1 restore $2
else
    echo "ERROR: no docker-compose.yml file. Project not initialized."
fi
