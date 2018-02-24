#!/bin/bash
set -e
cd "`dirname $0`"

if [ "x$1" = "x--enabled" ]; then
    FILTER_ENABLED=1
    shift
fi

FILTER="$1"
if [ -z $FILTER ]; then FILTER=config; fi

if [ "x$FILTER_ENABLED" = "x1" ]; then
    for i in $(ls */$FILTER|cut -d/ -f1); do
        if ! grep STATE=DISABLED $i/config > /dev/null; then
            echo $i
        fi
    done
else
    ls */$FILTER|cut -d/ -f1
fi
