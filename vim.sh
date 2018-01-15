#!/bin/bash

. _scripts/base.sh

shift

if [ "x$1" = "x" ]; then
    C=bash
else
    C="$@"
fi

if test -e $PROJECT/docker-compose.yml; then
    docker run --rm -it -v `pwd`/${PROJECT}/volumes/html:/var/www/html -v `pwd`/${PROJECT}/volumes/mysql:/var/lib/mysql --workdir /var/www/html --user=root haron/vim $C
else
    echo "ERROR: Project not initialized."
fi
