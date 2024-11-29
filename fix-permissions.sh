#!/bin/bash

. "$(dirname "$0")/_scripts/base.sh"

if test -e $PROJECT/docker-compose.yml; then
    echo "=== Setting permissions for project: $PROJECT ==="
    echo "=== Setting HTML directory permissions ==="
    docker run --rm -v `pwd`/${PROJECT}/volumes/html:/var/www/html -v `pwd`/${PROJECT}/volumes/mysql:/var/lib/mysql --workdir /var/www/html --user=root haron/vim chown -cR www-data:www-data /var/www/html
    
    # Check if wordpress container is running before executing
    if docker ps --format '{{.Names}}' | grep -q "${APPNAME}_wordpress_1"; then
        echo "=== Setting WordPress cache permissions ==="
        docker exec "${APPNAME}_wordpress_1" sh -c "mkdir -p /cache; chown www-data:www-data /cache"
    fi
    
    # Check if phpmyadmin container is running before executing
    if docker ps --format '{{.Names}}' | grep -q "${APPNAME}_phpmyadmin_1"; then
        echo "=== Setting phpMyAdmin session permissions ==="
        docker exec "${APPNAME}_phpmyadmin_1" sh -c "chown www-data:www-data /sessions"
    fi
    echo "=== Permissions set successfully ==="
else
    echo "=== ERROR: Project not initialized ==="
    echo "Project not initialized."
fi
