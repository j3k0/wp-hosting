#!/bin/bash

. _scripts/base.sh

echo "=== Starting initialization for project: $PROJECT ==="

# Generate the docker-compose.yml file
if test -e $PROJECT/docker-compose.yml; then
    echo "Project $PROJECT already has a docker-compose.yml file."
    echo "It's probably already initialized."
    echo "If not, try running: ./cleanup.sh $PROJECT"
    echo "Then try again..."
    echo
    exit 1
fi

echo "=== Building and updating Docker images ==="
echo "Make sure docker image is built and up to date"
docker pull wordpress
docker pull wordpress:php7.1
docker build -t fovea/wordpress docker

echo "=== Configuring hosting files ==="
echo "Make sure all necessary hosting files are in place"
./configure.sh

echo "=== Generating project files ==="
echo "Generating docker-compose.yml..."
./_scripts/docker-compose.yml.sh > $PROJECT/docker-compose.yml
echo "Generating nginx-site config..."
./_scripts/nginx-site.sh > $PROJECT/nginx-site
echo "Generating php.ini..."
./_scripts/php.ini.sh > $PROJECT/php.ini

echo "=== Setting up DNS records ==="
echo "Setup domain name with cloudflare"
./create-dns-records.sh $PROJECT

echo "=== Creating backup directory ==="
mkdir -p /backups/$PROJECT
echo "Backup directory created: /backups/$PROJECT"

echo "=== Setting up Nginx configuration ==="
if test -d /etc/nginx/sites-enabled && ! test -e /etc/nginx/sites-enabled/$PROJECT; then
    if [ -w "/etc/nginx/sites-enabled" ]; then
        echo "Installing /etc/nginx/sites-enabled/$PROJECT"
        ln -s $(pwd)/$PROJECT/nginx-site /etc/nginx/sites-enabled/$PROJECT
    else
        echo "Warning: No write access to /etc/nginx/sites-enabled, skipping"
    fi
else
    echo "Skip nginx config (already exists or sites-enabled not found)"
fi

echo "=== Starting MySQL ==="
echo "MySQL needs time to start"
./docker-compose.sh $PROJECT up -d db
echo "Waiting 60s for mysql to be ready"
sleep 60

echo "=== Configuring phpMyAdmin ==="
echo "Create phpMyAdmin database user"
docker run --rm -i --network=${APPNAME}_default --link ${APPNAME}_db_1:db mysql mysql -hdb -uroot -p$ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON phpmyadmin.* TO 'admin'@'%';"

echo "=== Generating docker-compose override ==="
echo "Generate the docker-compose override file"
./_scripts/docker-compose.override.yml.sh > $PROJECT/docker-compose.override.yml

echo "=== Initialization complete ==="
echo "You can now start the server with the command below:"
echo
echo "    ./start.sh $PROJECT"
echo
echo "You may also have to reload nginx config with:"
echo
echo "    service nginx reload"
echo
