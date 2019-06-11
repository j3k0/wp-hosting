#!/bin/bash

if test ! -e $1/config; then
    echo "Usage: $0 <project>"
    echo
    echo "- Set PULL_IMAGES=YES to pull docker images"
    echo
    exit 1
fi

. _scripts/base.sh

#
# pull docker images if PULL_IMAGES env is set to YES
#
if [ "x$PULL_IMAGES" = xYES ]; then
    docker pull wordpress
    docker pull mysql
    docker pull jeko/sftp:latest
    docker pull corbinu/docker-phpmyadmin
fi

#
# updating docker images
#
if [ "x$SKIP_DOCKER" != xYES ]; then
    UPDATED="db sftp phpmyadmin backup wordpress"
    ./docker-compose.sh $PROJECT stop
    for C in $UPDATED; do
        ./docker-compose.sh $PROJECT rm -f $C || true
    done
    ./docker-compose.sh $PROJECT up -d

    sleep 3
fi

function thrice() {
    echo "$@"
    "$@" || true
    "$@" || true
    "$@" || true
}

#
# update core
#
thrice ./wp-cli.sh $PROJECT core update

#
# update the database
#
thrice ./wp-cli.sh $PROJECT core update-db

#
# update plugins
#
thrice ./wp-cli.sh $PROJECT plugin update --all
