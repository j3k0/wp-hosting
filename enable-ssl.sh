#!/bin/bash

. _scripts/base.sh

echo $PROJECT ...

if [ "x$TYPE" = "xwordpress" ]; then

    if [ "x$NO_CHECK" != "x1" ] && sudo cat $PROJECT/volumes/html/wp-config.php | grep _SERVER | grep HTTPS | grep on; then
        echo $PROJECT already setup
        exit 0
    fi

    if ! cat $PROJECT/nginx-site | grep ssl_certificate_key | grep letsencrypt | grep -v phpmyadmin; then
        echo "$PROJECT does not have a letsencrypt certificate"
        exit 0
    fi

    echo "search-replace http://$DOMAIN to $(./main-url.sh $PROJECT)"
    echo "Do it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        ./wp-cli.sh $PROJECT --skip-plugins search-replace http://$DOMAIN $(./main-url.sh $PROJECT)
    fi

    echo "search-replace http://www.$DOMAIN to $(./main-url.sh $PROJECT)"
    echo "Do it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        ./wp-cli.sh $PROJECT --skip-plugins search-replace http://www.$DOMAIN $(./main-url.sh $PROJECT)
    fi

    echo "search-replace http://${PROJECT}.${BACKEND_DOMAIN} to $(./main-url.sh $PROJECT)"
    echo "Do it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        ./wp-cli.sh $PROJECT --skip-plugins search-replace http://${PROJECT}.${BACKEND_DOMAIN} $(./main-url.sh $PROJECT)
    fi

    echo "search-replace http://${BACKEND_WWW_DOMAIN} to $(./main-url.sh $PROJECT)"
    echo "Do it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        ./wp-cli.sh $PROJECT --skip-plugins search-replace http://${BACKEND_WWW_DOMAIN} $(./main-url.sh $PROJECT)
    fi

    echo "install ssl-fixer plugin?"
    echo "Do it? (y/n)"
    read DO_IT
    if [ "x$DO_IT" = "xy" ]; then
        ./wp-cli.sh $PROJECT --skip-plugins plugin install ssl-insecure-content-fixer
        ./wp-cli.sh $PROJECT --skip-plugins plugin activate ssl-insecure-content-fixer
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
        sudo ./fix-permissions.sh $PROJECT
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
else
    echo "Website is not using wordpress, not much I can do here..."
fi

# Make sure spdy is enabled
sed --in-place=.bak 's/listen 443 ssl;/listen 443 ssl spdy;/g' $PROJECT/nginx-site
