#!/bin/bash

. _scripts/base.sh

# Generate the docker-compose file
if test -e $PROJECT/docker-compose.yml; then
    cd $PROJECT
    docker-compose up -d
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
