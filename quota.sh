#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    echo -n "$PROJECT "
    docker run --rm -it -v `pwd`/${PROJECT}/volumes/html:/var/www/html -v `pwd`/${PROJECT}/volumes/mysql:/var/lib/mysql --workdir /var/www/html --user=root haron/vim du -hs . | awk '{print $1}'
else
    echo "ERROR: Project not initialized."
fi
