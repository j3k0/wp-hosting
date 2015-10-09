set -e
cd "`dirname $0`"

if test ! -e $1/config; then
    echo "Usage: $0 <project>"
    echo
    echo "The script expect a configuration file located at ./<project>/config"
    exit 1
fi

PROJECT="`basename $1`"
APPNAME=`echo $PROJECT | sed s/\\\\.//g`
echo $APPNAME

# Read and export config
. $PROJECT/config
export WORDPRESS_PORT
export PHPMYADMIN_PORT
export ROOT_PASSWORD
export ADMIN_PASSWORD
if [ "x$SALT" = "x" ]; then
    SALT="$RANDOM-$RANDOM-$RANDOM-$RANDOM"
fi
export SALT
