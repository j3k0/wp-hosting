#!/bin/bash

set -e
cd "$(dirname "$0")"

SOURCE_PROJECT=$1
DESTINATION_PROJECT=$2

function cleanup_line_separators() {
    tr -d '\r' | tr -d '\n'
}

function safe_wp_cli() {
    F=/tmp/duplicate-wp-cli.out
    ./wp-cli.sh "$@" > $F
    if grep "mysqli_real_connect" "$F" > /dev/null; then
        rm -f "$F"
        safe_wp_cli "$@"
    else
        cat "$F"
        rm -f "$F"
    fi
}

function user_last_update() {
    set +e
    safe_wp_cli "$1" user meta get "$2" last_update 2> /dev/null | cleanup_line_separators | awk '{print $1}'
    set -e
}

function user_get_json() {
    safe_wp_cli "$1" user get "$2" --format=json | cleanup_line_separators
}

# UPDATE USER:
# user_login
# user_email
# display_name
function field_argument() {
    echo "--$2=\"$(echo "$1" | jq --raw-output ."$2")\""
}

function user_update_from_json() {
    safe_wp_cli "$1" user update $(echo "$2" | jq .ID) \
        $(field_argument "$2" user_login) \
        $(field_argument "$2" user_email) \
        $(field_argument "$2" display_name)
}

function user_meta_get() {
    safe_wp_cli $1 user meta get $2 $3 | cleanup_line_separators
}

# READ and UPDATE USER META:
# first_name
# last_name
# nickname
# last_update
function user_meta_get_json() {
    echo "
    {
        \"ID\": \"$2\",
        \"first_name\": \"$(user_meta_get $1 $2 first_name)\",
        \"last_name\": \"$(user_meta_get $1 $2 last_name)\",
        \"nickname\": \"$(user_meta_get $1 $2 nickname)\",
        \"last_update\": \"$(user_meta_get $1 $2 last_update)\"
    }"
}

function user_meta_update_from_json() {
    safe_wp_cli $1 user meta update $(echo "$2" | jq .ID) first_name $(echo "$2" | jq .first_name)
    safe_wp_cli $1 user meta update $(echo "$2" | jq .ID) last_name $(echo "$2" | jq .last_name)
    safe_wp_cli $1 user meta update $(echo "$2" | jq .ID) nickname $(echo "$2" | jq .nickname)
    safe_wp_cli $1 user meta update $(echo "$2" | jq .ID) last_update $(echo "$2" | jq .last_update)
}

if test ! -e $SOURCE_PROJECT/config || test ! -e $DESTINATION_PROJECT/config; then
    echo
    echo "Duplicate a website from one project to another"
    echo
    echo "Usage: $0 <source_project> <destination_project>"
    exit 1
fi

echo
echo "Gathering configuration..."

# Generate the docker base application names
SOURCE_APPNAME=`echo $SOURCE_PROJECT | sed s/\\\\.//g | sed s/-//g`
DESTINATION_APPNAME=`echo $DESTINATION_PROJECT | sed s/\\\\.//g | sed s/-//g`

# Extract www volumes names for both source and destinationcontainers
SOURCE_WWW_PATH="$(pwd)/$SOURCE_PROJECT/volumes/html"
DESTINATION_WWW_PATH="$(pwd)/$DESTINATION_PROJECT/volumes/html"

# Extract current source and destination URLs
SOURCE_URL=$(safe_wp_cli $SOURCE_PROJECT option get siteurl | tr -d '\r' | tr -d '\n')
echo "Destination URL: (ENTER for auto-detect)"
read DESTINATION_URL
if [ "x$DESTINATION_URL" = "x" ]; then
    DESTINATION_URL=$(safe_wp_cli $DESTINATION_PROJECT option get siteurl | tr -d '\r' | tr -d '\n')
fi

# Extract current and destination servers
SOURCE_SERVER=$(echo $SOURCE_URL | cut -d/ -f3)
DESTINATION_SERVER=$(echo $DESTINATION_URL | cut -d/ -f3)

echo
echo "Duplicating $SOURCE_URL into $DESTINATION_URL ..."
if [ "x$FAST" = "x1" ]; then
    echo "    ... using fast mode"
fi
if [ "x$IGNORE_USERS" = "x1" ]; then
    echo "    ... do not override user accounts"
fi
echo

sleep 5

if [ "x$FAST" = "x1" ]; then

    if [ "x$IGNORE_USERS" = "x1" ]; then
        IGNORE_USERS_ARGS="--ignore-table=wordpress.wp_users --ignore-table=wordpress.wp_usermeta"
    fi

    echo "1/5 -- Synchronize file systems"
    docker run --rm -it -v $SOURCE_WWW_PATH:/src -v $DESTINATION_WWW_PATH:/dst jeko/rsync-client -a --delete --exclude=wp-config.php --exclude=.git /src/ /dst

    echo "2/5 -- Dump the source database (excluding users)"
    . $SOURCE_PROJECT/config
    docker exec -it ${SOURCE_APPNAME}_db_1 mysqldump -u root -p${ROOT_PASSWORD} wordpress --routines $IGNORE_USERS_ARGS --default-character-set=utf8mb4 --result-file=/tmp/dump.sql

    echo "3/5 -- Copy database dump to destination"
    docker cp ${SOURCE_APPNAME}_db_1:/tmp/dump.sql ${SOURCE_PROJECT}/dump.sql
    docker cp ${SOURCE_PROJECT}/dump.sql ${DESTINATION_APPNAME}_db_1:/tmp/dump.sql
    rm -f $SOURCE_PROJECT/dump.sql

    echo "4/5 -- Import into destination database"
    . $DESTINATION_PROJECT/config
    docker exec -it ${DESTINATION_APPNAME}_db_1 sh -c "mysql -u root -p${ROOT_PASSWORD} wordpress --default-character-set=utf8mb4 < /tmp/dump.sql"

    echo "5/5 -- Rename the destination website"
    safe_wp_cli $DESTINATION_PROJECT search-replace $SOURCE_URL $DESTINATION_URL
    safe_wp_cli $DESTINATION_PROJECT search-replace $SOURCE_SERVER $DESTINATION_SERVER

    # echo "Do you also want to update users metadata (this might take a while)? Enter \"y\" to accept."
    # read Q
    # if [ "Q$Q" = "Qy" ]; then
    #     SOURCE_USERS=$(safe_wp_cli $SOURCE_PROJECT user list --field=id | tr '\r' ' ' | tr '\n' ' ')
    #     DESTINATION_USERS=$(safe_wp_cli $DESTINATION_PROJECT user list --field=id | tr '\r' ' ' | tr '\n' ' ')
    #     for USER_ID in $SOURCE_USERS; do
    #         if [ $USER_ID != 1 ] && echo $DESTINATION_USERS | grep -w $USER_ID > /dev/null; then
    #             echo "Checking user_id ${USER_ID}..."
    #             SOURCE_USER_LAST_UPDATE=$(user_last_update $SOURCE_PROJECT $USER_ID)
    #             if [ "${SOURCE_USER_LAST_UPDATE}0" != "0" ]; then
    #                 DESTINATION_USER_LAST_UPDATE=$(user_last_update $DESTINATION_PROJECT $USER_ID)
    #                 if [ ${SOURCE_USER_LAST_UPDATE}0 -gt ${DESTINATION_USER_LAST_UPDATE}0 ]; then
    #                     echo "Has changed in source website. Let's update!"
    #                     SOURCE_USER=$(user_get_json $SOURCE_PROJECT $USER_ID)
    #                     user_update_from_json $DESTINATION_PROJECT "$SOURCE_USER"
    #                     SOURCE_USER_META=$(user_meta_get_json $SOURCE_PROJECT $USER_ID)
    #                     user_meta_update_from_json $DESTINATION_PROJECT "$SOURCE_USER_META"
    #                     echo "Updated:"
    #                     echo "$SOURCE_USER" | jq .
    #                     echo "$SOURCE_USER_META" | jq .
    #                 fi
    #             fi
    #         fi
    #     done
    # fi

else

    if [ $UID != 0 ]; then
        echo "Please run as root"
        exit 1
    fi

    if [ "x$IGNORE_USERS" = "x1" ]; then
        echo "IGNORE_USERS is only supported in FAST mode"
        exit 1
    fi

    echo "1/6 -- Backup the source project"
    ./backup.sh $SOURCE_PROJECT

    echo "2/6 -- Flatten the backup"
    BACKUP_ID=$(./last-backup.sh $SOURCE_PROJECT)
    ./flatten-backup.sh $SOURCE_PROJECT $BACKUP_ID

    echo "3/6 -- Cleanup up all destination project backup" # move to another place
    mkdir -p /backups/${DESTINATION_PROJECT}.bak
    for i in /backups/$DESTINATION_PROJECT/*; do
        if test -e $i; then
            mv $i /backups/${DESTINATION_PROJECT}.bak/
        fi
    done
    if test -e /backups/$DESTINATION_PROJECT/.snapshot; then
        mv /backups/$DESTINATION_PROJECT/.snapshot /backups/${DESTINATION_PROJECT}.bak/
    fi

    echo "4/6 -- Copy the source backup to the destination project"
    cp $SOURCE_PROJECT/flat-backups/backup_${BACKUP_ID}.* /backups/$DESTINATION_PROJECT

    echo "5/6 -- Restore source backup to the destination project"
    ./restore.sh $DESTINATION_PROJECT $BACKUP_ID

    echo "6/6 -- Rename the destination website"
    safe_wp_cli $DESTINATION_PROJECT search-replace $SOURCE_URL $DESTINATION_URL
    safe_wp_cli $DESTINATION_PROJECT search-replace $SOURCE_SERVER $DESTINATION_SERVER
fi

echo "Done"

