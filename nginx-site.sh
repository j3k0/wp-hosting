#!/bin/bash

. _scripts/base.sh

echo "=== Setting up Nginx configuration for project: $PROJECT ==="

export SSL_DIR="/etc/ssl/$PROJECT"
export CONFIG_DIR="/etc/nginx/wp-hosting"

echo "=== Cleaning up any existing configuration ==="
ssh root@wp-hosting-lb "rm -f /etc/nginx/sites-enabled/$PROJECT.conf"
ssh root@wp-hosting-lb "rm -f /etc/nginx/sites-available/$PROJECT.conf"

echo "=== Creating directories on load balancer ==="
ssh root@wp-hosting-lb mkdir -p "$SSL_DIR" "$CONFIG_DIR"

echo "=== Copying configuration files ==="
echo "Copying config files to: $CONFIG_DIR"
rsync -r config/ "root@wp-hosting-lb:$CONFIG_DIR"

echo "=== Setting up SSL certificates ==="
echo "Copying SSL files to: $SSL_DIR"
rsync $PROJECT/ssl/ "root@wp-hosting-lb:$SSL_DIR"

echo "=== Generating Nginx configuration ==="
echo "Generating nginx-site config file"
./_scripts/nginx-site.sh > $PROJECT/nginx-site

echo "=== Installing Nginx configuration ==="
echo "Copying config to sites-available"
scp "$PROJECT/nginx-site" root@wp-hosting-lb:/etc/nginx/sites-available/$PROJECT.conf

echo "=== Enabling site configuration ==="
echo "Creating symlink in sites-enabled"
ssh root@wp-hosting-lb ln -s ../sites-available/$PROJECT.conf /etc/nginx/sites-enabled/$PROJECT.conf

echo "=== Reloading Nginx ==="
ssh root@wp-hosting-lb service nginx reload

echo "=== Nginx configuration completed ==="
