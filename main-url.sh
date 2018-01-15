#!/bin/bash

. _scripts/base.sh

EXT=$(echo $DOMAIN | cut -d. -f3)
if [ "x$EXT" = "x" ]; then
    echo http://www.$DOMAIN
else
    echo http://$DOMAIN
fi
