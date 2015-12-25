#!/bin/bash

. _scripts/base.sh

if test -e $PROJECT/docker-compose.yml; then
    cd $PROJECT
    docker-compose up -d
    cd ..
    sleep 2
    if ./wp-cli.sh $PROJECT core is-installed; then
        echo "Wordpress already installed."
    else
        echo "Installing Wordpress..."
        ./wp-cli.sh $PROJECT core install --url=http://$DOMAIN --title=$DOMAIN --admin_user=admin --admin_password=$ADMIN_PASSWORD --admin_email=admin@$DOMAIN
        ./wp-cli.sh $PROJECT plugin install hectane --activate
        ./wp-cli.sh $PROJECT option set hectane_settings '{"host":"mail","port":"8025","tls_ignore":"on","username":"","password":""}' --format=json
    fi
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
