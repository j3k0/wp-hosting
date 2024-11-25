set -e
if [ "$(basename "$(dirname "$0")")" == "_scripts" ]; then
    cd "$(dirname "$0")/.."
else
    cd "$(dirname "$0")"
fi


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
APPNAME=`echo $PROJECT | sed s/\\\\.//g`

# Read and export config
. $PROJECT/config
export PROJECT
export ORIGINAL_DOMAIN
export APPNAME
export WORDPRESS_PORT
export PHPMYADMIN_PORT
export SFTP_PORT
export ROOT_PASSWORD
export ADMIN_PASSWORD
export TYPE
export WORDPRESS_PATH

if [ "x$DOMAIN" = "x" ]; then
    DOMAIN=$PROJECT
fi
export DOMAIN

# Utiliser ORIGINAL_DOMAIN pour les domaines backend si défini
BACKEND_DOMAIN_BASE=${ORIGINAL_DOMAIN:-$DOMAIN}

export BACKEND_PMA_DOMAIN="phpmyadmin-${BACKEND_DOMAIN_BASE//./-}.${BACKEND_DOMAIN}"
export BACKEND_WWW_DOMAIN="www-${BACKEND_DOMAIN_BASE//./-}.${BACKEND_DOMAIN}"
export BACKEND_CDN_DOMAIN="cdn-${BACKEND_DOMAIN_BASE//./-}.${BACKEND_DOMAIN}"

if [ "x$SALT" = "x" ]; then
    SALT="$RANDOM-$RANDOM-$RANDOM-$RANDOM"
fi
export SALT
