#!/bin/bash

set -e
cd "`dirname $0`"
if [ "x$1" = "x" ] || [ ! -e "$1/config" ]; then
    echo "Usage: $0 <project>"
    echo
    echo "Generate a playground project cloned from <project>"
    exit 1
fi

FROM_PROJECT="$1"

. "$FROM_PROJECT/config"

DOMAIN="wp.playground.$DOMAIN"
PROJECT="${FROM_PROJECT}.playground"

if [ _`echo $PROJECT | cut -d. -f1` != _wp ]; then
    PROJECT="wp.$PROJECT"
fi

export PLAYGROUND=1

if [ ! -e "$PROJECT" ]; then
    ./deploy.sh "$PROJECT" "$DOMAIN"
fi

. "$PROJECT/config"

# Restore last backup from source project
#sudo rsync -av "$FROM_PROJECT/backups/" "$PROJECT/backups"
# Fast clone backups using hard links
sudo mkdir -p /backups/$PROJECT
sudo rm -f /backups/$PROJECT/*
for i in /backups/$FROM_PROJECT/backup*; do
    f=`basename $i`
    if test ! -e /backups/$PROJECT/$f; then
        sudo ln $i /backups/$PROJECT/$f
    fi
done
sudo cp -a /backups/$FROM_PROJECT/.snapshot /backups/$PROJECT/.snapshot

./docker-compose.sh $PROJECT up -d --no-recreate --no-deps backup
LAST_BACKUP_ID=`./restore.sh "$PROJECT" | grep -- - | tail -1`
./restore.sh "$PROJECT" $LAST_BACKUP_ID
./docker-compose.sh $PROJECT stop backup
./docker-compose.sh $PROJECT rm backup

FROM_DOMAIN=`./wp-cli.sh $PROJECT --skip-plugins option get siteurl | tr -d '\r' | tr -d '\n'`
echo
echo from: $FROM_DOMAIN
echo to: $DOMAIN
echo

if ./wp-cli.sh --skip-plugins --url=$FROM_DOMAIN core is-installed --network; then
    ./wp-cli.sh $PROJECT --skip-plugins search-replace --url=$FROM_DOMAIN $FROM_DOMAIN $DOMAIN --recurse-objects --network --skip-columns=guid
else
    ./wp-cli.sh $PROJECT --skip-plugins search-replace $FROM_DOMAIN http://$DOMAIN --recurse-objects --skip-columns=guid
fi
