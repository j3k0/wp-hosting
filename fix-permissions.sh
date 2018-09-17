#!/bin/bash

. "$(dirname "$0")/_scripts/base.sh"

if test -e $PROJECT/docker-compose.yml; then
    echo "$PROJECT ..."
    docker run --rm -it -v `pwd`/${PROJECT}/volumes/html:/var/www/html -v `pwd`/${PROJECT}/volumes/mysql:/var/lib/mysql --workdir /var/www/html --user=root haron/vim chown -cR www-data:www-data /var/www/html
    docker exec -it ${APPNAME}_wordpress_1 sh -c "mkdir -p /cache; chown www-data:www-data /cache"
    echo "$PROJECT Done"
else
    echo "ERROR: Project not initialized."
fi
