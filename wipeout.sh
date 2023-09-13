#!/bin/bash

. _scripts/base.sh

if [ `whoami` != root ]; then
    echo Please, run this as root or you might loose file permissions!
    exit 1
fi

if [ "_$2" = "_" ]; then
    echo "usage $0 <project> <days ago|ALL>"
    exit 1
fi

DAYS_AGO="$2"
if [ "$DAYS_AGO" = "ALL" ]; then
	DAYS_AGO=""
fi

WIPEOUT_INCREMENTAL=YES ./flatten-backup.sh $PROJECT `./last-backup.sh $PROJECT $DAYS_AGO`
