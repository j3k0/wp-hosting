#!/bin/sh
. _scripts/base.sh
mkdir -p $PROJECT/volumes
echo 'Fetching database'
test -e $PROJECT/volumes/mysql || \
    docker run --rm -it --volumes-from ${APPNAME}_dbdata_1 -v "`pwd`/$PROJECT/volumes:/volumes" debian cp -a /var/lib/mysql /volumes/mysql
echo 'Fetching website'
test -e $PROJECT/volumes/html || \
    docker run --rm -it --volumes-from ${APPNAME}_webdata_1 -v "`pwd`/$PROJECT/volumes:/volumes" debian cp -a /var/www/html/ /volumes/html
