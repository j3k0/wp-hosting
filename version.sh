#!/bin/bash

if [ "x$1" == "x-w" ]; then
    shift
    WITH_NAME=1
fi

. _scripts/base.sh

VERSION="`cat $PROJECT/docker-compose.yml | grep version: | cut -d\' -f2`"
if [ "x$VERSION" = "x" ]; then
    VERSION=1
fi
if [ "x$VERSION" = "x2.2" ]; then
    VERSION=2
fi

if [ "x$WITH_NAME" = "x" ]; then
    echo $VERSION
else
    echo "$VERSION:$PROJECT"
fi
