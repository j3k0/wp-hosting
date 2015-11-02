#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    echo -n "$PROJECT "
    docker run --rm -it --volumes-from ${APPNAME}_webdata_1 --volumes-from ${APPNAME}_dbdata_1 --workdir /var/www/html --user=root haron/vim du -hs . | awk '{print $1}'
else
    echo "ERROR: Project not initialized."
fi
