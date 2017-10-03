#!/bin/bash

set -e

/usr/bin/certbot renew

# for i in wp.*/letsencrypt.conf
# do
#     DOMAIN=`cat $i`
#     PROJECT=`dirname $i`
#     echo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT/ssl/nginx.crt
#     echo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT/ssl/nginx.key
# done

service nginx reload
