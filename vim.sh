#!/bin/bash

. _scripts/base.sh

shift

if [ "x$1" = "x" ]; then
    C=bash
else
    C="$@"
fi

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    docker run --rm -it --volumes-from ${APPNAME}_webdata_1 --volumes-from ${APPNAME}_dbdata_1 --workdir /var/www/html --user=root haron/vim $C
else
    echo "ERROR: Project not initialized."
fi
