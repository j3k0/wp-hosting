set -e
cd "$(dirname "$0")"

STATE=
TYPE=

. config/base

if test ! -e $1/config; then
    echo "Usage: $0 <project>"
    echo
    echo "The script expect a configuration file located at ./<project>/config"
    exit 1
fi

PROJECT="`basename $1`"
APPNAME=`echo $PROJECT | sed s/\\\\.//g | sed s/-//g`

# Read and export config
. $PROJECT/config
export PROJECT
export APPNAME
export WORDPRESS_PORT
export PHPMYADMIN_PORT
export SFTP_PORT
export ROOT_PASSWORD
export ADMIN_PASSWORD

if [ "x$DOMAIN" = "x" ]; then
    DOMAIN=$PROJECT
fi
export DOMAIN

export BACKEND_PMA_DOMAIN="phpmyadmin-${DOMAIN//./-}.${BACKEND_DOMAIN}"
export BACKEND_WWW_DOMAIN="www-${DOMAIN//./-}.${BACKEND_DOMAIN}"
export BACKEND_CDN_DOMAIN="cdn-${DOMAIN//./-}.${BACKEND_DOMAIN}"

if [ "x$SALT" = "x" ]; then
    SALT="$RANDOM-$RANDOM-$RANDOM-$RANDOM"
fi
export SALT
