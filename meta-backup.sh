#!/bin/bash
set -e

cd "$(dirname $0)"
echo > ./meta-backup.log

BACKUP_DIR=/meta-backup/$(hostname)/wp-hosting
mkdir -p $BACKUP_DIR
if [ "x$NOT_NICE" = "x1" ]; then
    rsync -va --log-file=./meta-backup.log --exclude "wp.*.playground" --delete "$(pwd)"/ $BACKUP_DIR
else
    nice -n 19 rsync -va --bwlimit=1000 --log-file=./meta-backup.log --exclude "wp.*.playground" --delete "$(pwd)"/ $BACKUP_DIR
fi

BACKUP_DIR=/meta-backup/$(hostname)/etc
mkdir -p $BACKUP_DIR
if [ "x$NOT_NICE" = "x1" ]; then
    rsync -va --log-file=./meta-backup.log --delete /etc/ $BACKUP_DIR
else
    nice -n 19 rsync -va --bwlimit=1000 --log-file=./meta-backup.log --delete /etc/ $BACKUP_DIR
fi
