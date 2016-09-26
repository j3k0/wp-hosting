#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    echo "$PROJECT ..."
    docker run --rm -it --volumes-from ${APPNAME}_webdata_1 --volumes-from ${APPNAME}_dbdata_1 --workdir /var/www/html --user=root haron/vim chown -cR www-data:www-data /var/www/html
    echo "$PROJECT Done"
else
    echo "ERROR: Project not initialized."
fi
