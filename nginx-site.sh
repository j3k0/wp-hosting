#!/bin/bash

. _scripts/base.sh

export SSL_DIR="/etc/ssl/$PROJECT"
export CONFIG_DIR="/etc/nginx/wp-hosting"
ssh root@wp-hosting-lb mkdir -p "$SSL_DIR" "$CONFIG_DIR"

echo "Copy config and SSL files"
rsync -r config/ "wp-hosting-lb:$CONFIG_DIR"
rsync $PROJECT/ssl/ "wp-hosting-lb:$SSL_DIR"

echo "Generate and copy nginx config"
./_scripts/nginx-site.sh > $PROJECT/nginx-site
scp "$PROJECT/nginx-site" root@wp-hosting-lb:/etc/nginx/sites-available/$PROJECT.conf
ssh root@wp-hosting-lb ln -s ../sites-available/$PROJECT.conf /etc/nginx/sites-enabled/$PROJECT.conf
ssh root@wp-hosting-lb service nginx reload
