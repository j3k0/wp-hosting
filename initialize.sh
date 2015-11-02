#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    echo "Project $PROJECT already has a docker-compose file."
    echo "It's probably already initialized."
    echo "If not, try running: ./cleanup.sh $PROJECT"
    echo "Then try again..."
    echo
    exit 1
fi
./_scripts/docker-compose.yml.sh > $PROJECT/docker-compose.yml
./_scripts/nginx-site.sh > $PROJECT/nginx-site
./_scripts/php.ini.sh > $PROJECT/php.ini
cd $PROJECT

# Install the nginx config
if ! test -e /etc/nginx/sites-enabled/$PROJECT; then
    echo "Installing /etc/nginx/sites-enabled/$PROJECT"
    ln -s $(pwd)/nginx-site /etc/nginx/sites-enabled/$PROJECT
fi

# MySQL needs time to start
docker-compose up -d db webdata
echo "Waiting 60s for mysql to be ready"
sleep 60

# phpMyAdmin
echo "Create phpMyAdmin database user"
docker run --rm -it --link ${APPNAME}_db_1:db mysql mysql -hdb -uroot -p$ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON phpmyadmin.* TO 'admin'@'%';"

echo "You can now start the server with the command below:"
echo
echo "    ./start.sh $PROJECT"
echo
echo "You may also have to reload nginx config with:"
echo
echo "    service nginx reload"
echo
