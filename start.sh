#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    ./docker-compose.sh $PROJECT build
    ./docker-compose.sh $PROJECT up -d
    sleep 3
    ./fix-permissions.sh $PROJECT
    if ./wp-cli.sh $PROJECT core is-installed; then
        echo "Wordpress already installed."
    else
        echo "Installing Wordpress..."
        ./wp-cli.sh $PROJECT core install --url=http://$DOMAIN --title=$DOMAIN --admin_user=admin --admin_password=$ADMIN_PASSWORD --admin_email=admin@$DOMAIN
        # ./wp-cli.sh $PROJECT plugin install hectane --activate
        # ./wp-cli.sh $PROJECT option set hectane_settings '{"host":"mail","port":"8025","tls_ignore":"on","username":"","password":""}' --format=json
    fi
    ./fix-permissions.sh $PROJECT
    # ./install-extensions.sh $PROJECT
    # docker cp _scripts/info.php ${APPNAME}_wordpress_1:/var/www/html/$APPNAME-info.php
    if test -e uptimerobot.yml; then
        ./setup-uptimerobot.sh $PROJECT
    fi

    if test ! -e "$PROJECT/docker-compose.override.yml"; then
        cp _scripts/docker-compose.override.yml "$PROJECT/docker-compose.override.yml"
    fi
    # ./letsencrypt.sh $PROJECT

    echo
    echo "$PROJECT is available at the following ports:"
    echo
    echo " - wordpress: $WORDPRESS_PORT"
    echo " - phpMyAdmin: $PHPMYADMIN_PORT"
    echo
    echo "Make sure to setup your links into the master proxy."
    echo
    echo "SFTP is open on port $SFTP_PORT"
    echo
else
    echo "ERROR: no docker-compose.yml file"
    echo "Run the command below instead:"
    echo
    echo "./initialize.sh $PROJECT"
    echo
fi
