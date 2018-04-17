#!/bin/bash

. _scripts/base.sh

PREEXT=$(echo $DOMAIN | cut -d. -f2)
EXT=$(echo $DOMAIN | cut -d. -f3)
if [ "x$EXT" = "x" ] || [ ${#PREEXT} -le 2 ]; then
    echo https://www.$DOMAIN
else
    echo https://$DOMAIN
fi
