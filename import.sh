#!/bin/sh

# This script allows to import a blog from another host using wp-hosting
#
# 1. run a backup on the remote hosts.
# 2. `scp` (or something) to here.
# 3. run ./import.sh PROJECT BACKUPNAME
#

# Load config
. _scripts/base.sh

if [ ! -e /backups/$PROJECT/backup_$2.tar.gz ]; then
    echo "Usage: $0 <project> <date>"
    echo
    echo "<date>: The timestamp of the backup to restore, in the format yyyyMMdd."
    . _scripts/listBackups.sh
    listBackups $PROJECT
    exit 1
fi

# Update port numbers in config
./_scripts/config.sh $PROJECT > $PROJECT/config

# Reload config
. _scripts/base.sh

# Reset project and start
./cleanup.sh $PROJECT
./initialize.sh $PROJECT
./start.sh $PROJECT

sudo service nginx reload

# Restore the selected backup
./restore.sh $PROJECT $2
