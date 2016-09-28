#!/bin/bash
set -e
cd "`dirname $0`"
BACKUP_DIR=/backup/`hostname`/wp-hosting
mkdir -p $BACKUP_DIR
nice -n 19 rsync -va --bwlimit=1000 --log-file=./meta-backup.log --exclude "wp.*.playground" --delete "$(pwd)"/ $BACKUP_DIR
