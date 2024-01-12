#!/bin/bash

. "$(dirname "$0")/_scripts/base.sh"


TTY_OPT=-t
if [ "x$NO_TTY" = "x1" ]; then
	TTY_OPT=
fi

# Check if there's a docker-compose.yml file
if test -e $PROJECT/docker-compose.yml; then
    shift
    if [ "x$ROOT" = "x1" ]; then
	    docker exec -i $TTY_OPT ${APPNAME}_db_1 mysql -u root -p${ROOT_PASSWORD} wordpress "$@" # 2>&1 | grep -v "Warning: Using a password"
    else
	    docker exec -i $TTY_OPT ${APPNAME}_db_1 mysql -u admin -p${ADMIN_PASSWORD} wordpress "$@" # 2>&1 | grep -v "Warning: Using a password"
    fi
else
    echo "ERROR: Project not initialized."
fi
