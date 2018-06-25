#!/bin/bash

set -e

# Fix phpmysqmin root paths
for PROJECT in $(./ls.sh); do
    echo '#' $PROJECT
    . _scripts/base.sh $PROJECT
    if [ "x$STATE" != "xDISABLED" ]; then
        PHPMYADMIN_WEBROOT="$(pwd)/$PROJECT/volumes/phpmyadmin"
        if [ -e "/etc/letsencrypt/renewal/${BACKEND_PMA_DOMAIN}.conf" ]; then
            sed --in-place "s|/proc/[0-9]*/root/www|$PHPMYADMIN_WEBROOT|g" "/etc/letsencrypt/renewal/${BACKEND_PMA_DOMAIN}.conf"
        fi
    fi
done

/usr/bin/certbot renew

# for i in wp.*/letsencrypt.conf
# do
#     DOMAIN=`cat $i`
#     PROJECT=`dirname $i`
#     echo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT/ssl/nginx.crt
#     echo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT/ssl/nginx.key
# done

service nginx reload
