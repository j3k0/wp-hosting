#!/bin/bash

. _scripts/base.sh

echo $PROJECT ...

if sudo cat $PROJECT/volumes/html/wp-config.php | grep _SERVER | grep HTTPS | grep on; then
    echo $PROJECT already setup
    exit 0
fi

if ! cat $PROJECT/nginx-site | grep ssl_certificate_key | grep Certbot | grep -v phpmyadmin; then
    echo "$PROJECT does not have a letsencrypt certificate"
    exit 0
fi

echo "search-replace http://$DOMAIN to $(./main-url.sh $PROJECT)"
echo "Do it? (y/n)"
read DO_IT
if [ "x$DO_IT" = "xy" ]; then
    ./wp-cli.sh $PROJECT search-replace http://$DOMAIN $(./main-url.sh $PROJECT)
fi

echo "search-replace http://www.$DOMAIN to $(./main-url.sh $PROJECT)"
echo "Do it? (y/n)"
read DO_IT
if [ "x$DO_IT" = "xy" ]; then
    ./wp-cli.sh $PROJECT search-replace http://www.$DOMAIN $(./main-url.sh $PROJECT)
fi

echo "search-replace http://${PROJECT}.${BACKEND_DOMAIN} to $(./main-url.sh $PROJECT)"
echo "Do it? (y/n)"
read DO_IT
if [ "x$DO_IT" = "xy" ]; then
    ./wp-cli.sh $PROJECT search-replace http://${PROJECT}.${BACKEND_DOMAIN} $(./main-url.sh $PROJECT)
fi

echo "install ssl-fixer plugin?"
echo "Do it? (y/n)"
read DO_IT
if [ "x$DO_IT" = "xy" ]; then
    ./wp-cli.sh $PROJECT plugin install ssl-insecure-content-fixer
    ./wp-cli.sh $PROJECT plugin activate ssl-insecure-content-fixer
fi

echo "add wp-config.php fix?"
echo "Do it? (y/n)"
read DO_IT
if [ "x$DO_IT" = "xy" ]; then
    sudo cp $PROJECT/volumes/html/wp-config.php $PROJECT/volumes/html/wp-config.bak.php
    cat << EOF > /tmp/wp-config.new.php
<?php

\$_SERVER['HTTPS'] = 'on';
\$_SERVER['SERVER_PORT'] = 443;

EOF
    cat $PROJECT/volumes/html/wp-config.php | tail -n +2 >> /tmp/wp-config.new.php
    sudo mv /tmp/wp-config.new.php $PROJECT/volumes/html/wp-config.php
    ./fix-permissions.sh $PROJECT
    sudo chmod 600 $PROJECT/volumes/html/wp-config.php
fi

if test -e $PROJECT/volumes/html/wp-content/cache; then
    echo "There is a cache:"
    ls $PROJECT/volumes/html/wp-content/cache
    echo "Clean it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        rm -fr $PROJECT/volumes/html/wp-content/cache
    fi
fi
