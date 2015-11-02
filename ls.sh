#!/bin/bash
set -e
cd "`dirname $0`"

FILTER="$1"
if [ -z $FILTER ]; then FILTER=config; fi

ls */$FILTER|cut -d/ -f1
