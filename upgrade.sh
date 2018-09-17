#!/bin/bash
set -e

if test ! -e $1/config; then
    echo "Usage: $0 <project>"
    echo
    echo "- Set PULL_IMAGES=YES to pull docker images"
    echo
    exit 1
fi

. _scripts/base.sh

if [ "`./version.sh $PROJECT`" = 1 ]; then
    echo "Upgrading from storage version 1"

    echo 'Fetching volumes'
    ./fetch-volumes.sh $PROJECT
    sleep 2

    echo 'Deactivate hectane'
    ./wp-cli.sh $PROJECT plugin deactivate hectane || true

    ./docker-compose.sh $PROJECT build || true
    ./docker-compose.sh $PROJECT stop || true
    ./docker-compose.sh $PROJECT rm -vf || true

    docker rm -vf ${APPNAME}_mail_1 || true

    ./_scripts/php.ini.sh > $PROJECT/php.ini
    ./_scripts/docker-compose.yml.sh > $PROJECT/docker-compose.yml

    ./start.sh $PROJECT
elif [ "`./version.sh $PROJECT`" = 2 ]; then
    echo "Updating docker-compose.yml and php.ini"
    ./_scripts/php.ini.sh > $PROJECT/php.ini
    ./_scripts/docker-compose.yml.sh > $PROJECT/docker-compose.yml
    if [ "x$STATE" != "xDISABLED" ]; then
        ./docker-compose.sh $PROJECT build || true
        ./docker-compose.sh $PROJECT up -d
    fi
fi

echo DONE
