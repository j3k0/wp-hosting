#!/bin/bash
set -e
cd "`dirname $0`"

if [ "x$1" = "x--help" ]; then
	echo "usage: $0 [--enabled|--disabled] [PREFIX]"
	echo
	echo "example:"
	echo
	echo "  $0 --enabled wp.fovea"
	echo "  return all enabled websites starting with wp.fovea"
	echo
	exit 0
fi

if [ "x$1" = "x--enabled" ]; then
    FILTER_ENABLED=1
    shift
elif [ "x$1" = "x--disabled" ]; then
    FILTER_DISABLED=1
    shift
fi

PREFIX="$1"
if [ -z $PREFIX ]; then PREFIX=wp.; fi

if [ "x$FILTER_ENABLED" = "x1" ]; then
    for i in $(ls $PREFIX*/config|cut -d/ -f1); do
        if ! grep STATE=DISABLED $i/config > /dev/null; then
            echo $i
        fi
    done
elif [ "x$FILTER_DISABLED" = "x1" ]; then
    for i in $(ls $PREFIX*/config|cut -d/ -f1); do
        if grep STATE=DISABLED $i/config > /dev/null; then
            echo $i
        fi
    done
else
    ls $PREFIX*/config|cut -d/ -f1
fi
