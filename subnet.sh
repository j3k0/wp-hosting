#!/bin/bash
. _scripts/base.sh

MIN_PORT="`cat */config | grep WORDPRESS_PORT | cut -d= -f2 | sort -n | head -1`"

if [ "x$2" = "x--gateway" ]; then
    echo $WORDPRESS_PORT | awk "{ printf \"10.10.%d.1\\n\", 1 + (\$1-$MIN_PORT) / 10; }"
else
    echo $WORDPRESS_PORT | awk "{ printf \"10.10.%d.0/24\\n\", 1 + (\$1-$MIN_PORT) / 10; }"
fi
