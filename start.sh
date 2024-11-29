#!/bin/bash

. _scripts/base.sh

echo "=== Starting initialization for project: $PROJECT ==="

if test -e $PROJECT/docker-compose.yml; then
    echo "=== Building Docker containers ==="
    ./docker-compose.sh $PROJECT build
    
    echo "=== Starting Docker containers ==="
    ./docker-compose.sh $PROJECT up -d
    
    echo "=== Setting permissions ==="
    sleep 3
    ./fix-permissions.sh $PROJECT
    
    if [ "x$TYPE" = "xwordpress" ]; then
        echo "=== Configuring WordPress ==="
        if ./wp-cli.sh $PROJECT core is-installed; then
            echo "WordPress already installed."
        else
            echo "Installing WordPress..."
            ./wp-cli.sh $PROJECT core install --url=http://$DOMAIN --title=$DOMAIN --admin_user=admin --admin_password=$ADMIN_PASSWORD --admin_email=admin@$DOMAIN
        fi
    else
        echo "=== Setting up PHP site ==="
        # Run commands inside the WordPress container
        docker exec "${APPNAME}_wordpress_1" sh -c "
            touch /var/www/html/wp-load.php && \
            if [ ! -e /var/www/html/index.php ] && [ ! -e /var/www/html/index.html ]; then
                echo '<!DOCTYPE html><html><head><title>$DOMAIN</title></head><body><h1>Welcome to $DOMAIN</h1></body></html>' > /var/www/html/index.html
            fi
        "
    fi
    
    echo "=== Fixing final permissions ==="
    ./fix-permissions.sh $PROJECT

    echo "=== Setting up monitoring ==="
    if test -e uptimerobot.yml; then
        ./setup-uptimerobot.sh $PROJECT
    fi

    echo "=== Generating override file ==="
    if test ! -e "$PROJECT/docker-compose.override.yml"; then
        ./_scripts/docker-compose.override.yml.sh "$PROJECT/docker-compose.override.yml"
    fi

    echo "=== Setup completed ==="
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
    echo "=== ERROR: Missing configuration ==="
    echo "No docker-compose.yml file found"
    echo "Run the command below instead:"
    echo
    echo "./initialize.sh $PROJECT"
    echo
fi
