#!/bin/bash

. _scripts/base.sh

# Chec if there's a docker-compose.yml file
if test -e $PROJECT/docker-compose.yml; then
    shift
    docker exec -it ${APPNAME}_db_1 mysql -u admin -p${ADMIN_PASSWORD} wordpress "$@" # 2>&1 | grep -v "Warning: Using a password"
else
    echo "ERROR: Project not initialized."
fi
