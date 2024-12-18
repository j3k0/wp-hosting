#!/bin/bash

. _scripts/base.sh

# Chec if there's a docker-compose.yml file
if test -e $PROJECT/docker-compose.yml; then
    shift
    docker exec -it ${APPNAME}_db_1 mysqldump -u root -p${ROOT_PASSWORD} "$@"
else
    echo "ERROR: Project not initialized."
fi
