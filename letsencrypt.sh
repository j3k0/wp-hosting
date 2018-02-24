#!/bin/bash
. _scripts/base.sh

shift

STAGING=
if [ "x$1" = "x--staging" ]; then
    STAGING="--staging"
    shift
fi

if [ "x$1" != "x--phpmyadmin-only" ]; then
    DOMAINS="`echo $(cat $PROJECT/nginx-site | grep server_name | head -1) | cut -d\  -f2- | sed 's/;//g' | sed 's/ / -d /g'`"
    echo
    echo LETSENCRYPT $DOMAINS
    echo
    set +e
    echo sudo certbot $STAGING --authenticator webroot --webroot-path $PROJECT/volumes/html --installer nginx --no-redirect -d $DOMAINS
    sudo certbot $STAGING --authenticator webroot --webroot-path $PROJECT/volumes/html --installer nginx --no-redirect -d $DOMAINS
    set -e
fi


if [ "x$1" != "x--web-only" ]; then
    echo
    echo LETSENCRYPT $DOMAINS
    echo
    DOMAINS="`echo $(cat $PROJECT/nginx-site | grep server_name | grep phpmyadmin | head -1) | cut -d\  -f2- | sed 's/;//g' | sed 's/ / -d /g'`"
    PHPMYADMIN_WEBROOT="/proc/$(docker inspect --format {{.State.Pid}} ${APPNAME}_phpmyadmin_1)/root/www"
    set +e
    sudo certbot $STAGING --authenticator webroot --webroot-path "$PHPMYADMIN_WEBROOT" --installer nginx --redirect -d $DOMAINS
fi
