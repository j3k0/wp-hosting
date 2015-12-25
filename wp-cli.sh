#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    shift
    docker run --rm -it -v $(pwd)/_scripts/wp:/usr/local/bin/wp -v $(which less):/usr/bin/less --link ${APPNAME}_db_1:mysql --volumes-from ${APPNAME}_webdata_1 --volumes-from ${APPNAME}_dbdata_1 --workdir /var/www/html --entrypoint wp --user=root wordpress --allow-root "$@"
else
    echo "ERROR: Project not initialized."
fi
