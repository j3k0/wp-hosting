#!/bin/bash
. _scripts/base.sh

DOMAINS="`echo $(cat $PROJECT/nginx-site | grep server_name | head -1) | cut -d\  -f2- | sed 's/;//g' | sed 's/ / -d /g'`"
sudo certbot --authenticator webroot --webroot-path $PROJECT/volumes/html --installer nginx --no-redirect -d $DOMAINS
