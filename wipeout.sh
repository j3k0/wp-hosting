#!/bin/sh

. _scripts/base.sh

if [ `whoami` != root ]; then
    echo Please, run this as root or you might loose file permissions!
    exit 1
fi

if [ "_$2" = "_" ]; then
    echo "usage $0 <project> <date>"
    exit 1
fi

WIPEOUT_INCREMENTAL=YES ./flatten-backup.sh $PROJECT `./last-backup.sh $PROJECT $2`
