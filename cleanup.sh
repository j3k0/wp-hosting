#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    cd $PROJECT
    docker-compose stop
    docker-compose rm
    echo "rm docker-compose.yml"
    rm -f docker-compose.yml
    echo "rm nginx config"
    rm -f /etc/nginx/sites-enabled/$PROJECT

    echo "You may now like to reload nginx:"
    echo
    echo "    service nginx reload"
    echo
fi
