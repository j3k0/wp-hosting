#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    shift
    if [ `./version.sh $PROJECT` -gt 1 ]; then
        NETWORK_ARG="--network ${APPNAME}_default --link db:mysql"
        VOLUMES_ARG="-v `pwd`/${PROJECT}/volumes/html:/var/www/html -v `pwd`/${PROJECT}/volumes/mysql:/var/lib/mysql"
    else
        VOLUMES_ARG="--volumes-from ${APPNAME}_webdata_1 --volumes-from ${APPNAME}_dbdata_1"
        NETWORK_ARG="--link ${APPNAME}_db_1:mysql"
    fi
    docker run --rm $NETWORK_ARG $VOLUMES_ARG -v $(pwd)/_scripts/wp:/usr/local/bin/wp -v $(which less):/usr/bin/less  --workdir /var/www/html --entrypoint wp --user=www-data wordpress --allow-root "$@"
else
    echo "ERROR: Project not initialized."
fi

sudo rm -fr /cache/nginx/*
