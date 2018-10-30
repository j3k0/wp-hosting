#!/bin/bash

. _scripts/base.sh

echo "$PROJECT ... ${STATE:-ENABLED}"
if [ "x$STATE" == "xDISABLED" ]; then
    echo "$PROJECT ..."
    ./docker-compose.sh "$PROJECT" down -v
    rm -f "/etc/nginx/sites-enabled/$PROJECT"
    LETSENCRYPT_IDS=$(cat "$PROJECT"/nginx-site |grep /etc/letsencrypt/live|grep fullchain.pem|cut -d/ -f5)
    for ID in $LETSENCRYPT_IDS; do
        sudo certbot delete --cert-name $ID || true
    done
    cp "$PROJECT/nginx-site" "$PROJECT/.nginx-site.bak"
    ./_scripts/nginx-site.sh > "$PROJECT/nginx-site"
    if test ! -e "$PROJECT/nginx-site.bak" || ! cmp "$PROJECT/nginx-site" "$PROJECT/.nginx-site.bak" > /dev/null 2>&1; then
        mv "$PROJECT/.nginx-site.bak" "$PROJECT/nginx-site.bak"
    else
        rm "$PROJECT/.nginx-site.bak"
    fi
else
    ./docker-compose.sh "$PROJECT" up -d
    if test ! -e "/etc/nginx/sites-enabled/$PROJECT"; then
        ln -s "$(pwd)/$PROJECT/nginx-site" "/etc/nginx/sites-enabled/$PROJECT"
    fi
fi
