#!/bin/bash
set -e
cd "`dirname $0`"
BACKUP_DIR=/backup/`hostname`/wp-hosting
mkdir -p $BACKUP_DIR
rsync -va --delete "$(pwd)"/ $BACKUP_DIR
