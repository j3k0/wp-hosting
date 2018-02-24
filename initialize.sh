#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose.yml file
if test -e $PROJECT/docker-compose.yml; then
    echo "Project $PROJECT already has a docker-compose.yml file."
    echo "It's probably already initialized."
    echo "If not, try running: ./cleanup.sh $PROJECT"
    echo "Then try again..."
    echo
    exit 1
fi

echo Make sure docker image is built and up to date
docker pull wordpress
docker pull wordpress:php7.1
docker build -t fovea/wordpress docker

echo Make sure all necessary hosting files are in place
./configure.sh

echo Generate project files
./_scripts/docker-compose.yml.sh > $PROJECT/docker-compose.yml
./_scripts/nginx-site.sh > $PROJECT/nginx-site
./_scripts/php.ini.sh > $PROJECT/php.ini

echo Setup domain name with cloudflare
./create-dns-records.sh $PROJECT

sudo mkdir -p /backups/$PROJECT

# echo Setup OVH CDN
# echo "Add www.$DOMAIN to OVH CDN? (y/N)"
# read ANSWER
# if [ "x$ANSWER" = "xy" ] || [ "x$ANSWER" = "xY" ]; then ./ovhcdn.sh www.$DOMAIN; fi
# echo "Add $DOMAIN to OVH CDN? (y/N)"
# read ANSWER
# if [ "x$ANSWER" = "xy" ] || [ "x$ANSWER" = "xY" ]; then ./ovhcdn.sh $DOMAIN; fi

echo Install the nginx config
if ! test -e /etc/nginx/sites-enabled/$PROJECT; then
    echo "Installing /etc/nginx/sites-enabled/$PROJECT"
    ln -s $(pwd)/$PROJECT/nginx-site /etc/nginx/sites-enabled/$PROJECT
fi

echo MySQL needs time to start
./docker-compose.sh $PROJECT up -d db
echo "Waiting 60s for mysql to be ready"
sleep 60

# phpMyAdmin
echo "Create phpMyAdmin database user"
docker run --rm -it --network=${APPNAME}_default --link ${APPNAME}_db_1:db mysql mysql -hdb -uroot -p$ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON phpmyadmin.* TO 'admin'@'%';"

echo "You can now start the server with the command below:"
echo
echo "    ./start.sh $PROJECT"
echo
echo "You may also have to reload nginx config with:"
echo
echo "    service nginx reload"
echo
