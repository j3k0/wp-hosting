#!/bin/bash

set -e

PROJECT=$1
FROMDOMAIN=$2
TODOMAIN=$3

function usage() {
    echo "usage: $0 <project> <from_domain> <to_domain>"
    exit 1
}

if [ "x$TODOMAIN" = "x" ];then
    usage
fi

if test ! -e $PROJECT/docker-compose.yml; then
    usage
fi

echo "Renaming $FROMDOMAIN to $TODOMAIN"

#FROMDOMAIN='www.goliathgames.us'
#FROMDOMAIN='www.wp.playground.www.goliathgames.us.ggs.ovh'
#TODOMAIN='www.wp.playground.www.goliathgames.us.ggs.ovh'

DBPREFIX=$(./vim.sh $PROJECT cat wp-config.php | grep "\$table_prefix" | cut -d \' -f 2)
if [ "x$DBPREFIX" = "x" ]; then
    usage
fi

QUERY1="SELECT blog_id FROM ${DBPREFIX}blogs WHERE domain=\"${FROMDOMAIN}\" LIMIT 1"
RESULT1=$(./mysql.sh $PROJECT -B -e "$QUERY1" | tail -1)
BLOG_ID=$(echo $RESULT1 | tail -1 | awk '{print $1}')
if [ "x$BLOG_ID" = "x" ] || [ "x$BLOG_ID" = "xblog_id" ]; then
    echo VALID_DOMAINS
    ./mysql.sh $PROJECT -e "SELECT domain from ${DBPREFIX}blogs"
    usage
fi
echo Blog ID: $BLOG_ID

echo ./mysql.sh $PROJECT -e "UPDATE ${DBPREFIX}blogs SET domain=\"${TODOMAIN}\" WHERE blog_id=$BLOG_ID"
./mysql.sh $PROJECT -e "UPDATE ${DBPREFIX}blogs SET domain=\"${TODOMAIN}\" WHERE blog_id=$BLOG_ID" || true
echo ./mysql.sh $PROJECT -e "INSERT INTO ${DBPREFIX}domain_mapping ( blog_id, domain, active ) VALUES ( $BLOG_ID, \"${TODOMAIN}\", 1 ) ON DUPLICATE KEY UPDATE domain=\"$TODOMAIN\", active=1"
./mysql.sh $PROJECT -e "INSERT INTO ${DBPREFIX}domain_mapping ( blog_id, domain, active ) VALUES ( $BLOG_ID, \"${TODOMAIN}\", 1 ) ON DUPLICATE KEY UPDATE domain=\"$TODOMAIN\", active=1" || true
echo ./wp-cli.sh $PROJECT --skip-plugins option update home "http://${TODOMAIN}" --url="${TODOMAIN}"
./wp-cli.sh $PROJECT --skip-plugins option update home "http://${TODOMAIN}" --url="${TODOMAIN}"
echo ./wp-cli.sh $PROJECT --skip-plugins option update siteurl "http://${TODOMAIN}" --url="${TODOMAIN}"
./wp-cli.sh $PROJECT --skip-plugins option update siteurl "http://${TODOMAIN}" --url="${TODOMAIN}"

./wp-cli.sh $PROJECT --skip-plugins search-replace "http://wp.playground.www.goliathgames.nl.ggs.ovh" "http://${TODOMAIN}" --url="${TODOMAIN}"
