#!/bin/bash

. _scripts/base.sh
. _scripts/listBackups.sh

N="$2"
if [ "_$N" = "_" ]; then N=1; fi

listBackups $PROJECT | grep -E '[0-9]+-[0-9]+' | tail -$N | head -1
