#!/bin/bash

CONFIRMED_LIST=""
if [ "x$1" = "x--sites" ]; then
    shift
    while [ "x$1" != "x" ]; do
       CONFIRMED_LIST="$CONFIRMED_LIST $1" 
       shift
    done
else
    YES=$([ "x$1" = "x-y" ] || [ "x$1" == "x--yes" ] && echo "1" || echo "0")
    for i in $(./ls.sh); do
        if [ $YES == 1 ]; then
            echo "$i..."
            CONFIRM=y
        elif [ "x$CONFIRM" != "xq" ]; then
            echo "Upgrade $i? [y/n/q]"
            read CONFIRM
        fi
        if [ "x$CONFIRM" = "xy" ]; then
            CONFIRMED_LIST="$CONFIRMED_LIST $i"
        fi
    done
fi

if [ "x$SKIP_DOCKER" != xYES ]; then
    for i in $(cat */docker-compose.yml | grep image | cut -d: -f2 | sort | uniq); do
        echo docker pull $i
        docker pull $i
    done

    docker pull $(cat docker/Dockerfile | grep FROM | cut -d\  -f2)
    docker pull $(cat phpmyadmin/Dockerfile | grep FROM | cut -d\  -f2)

    set -e
    docker build -t fovea/wordpress docker
    docker build -t fovea/phpmyadmin phpmyadmin
else
    set -e
fi

echo
echo "Let's go!"
echo

for i in $CONFIRMED_LIST; do
    ./upgrade.sh "$i"
    if [ "x$SLEEP_BETWEEN" != "x" ]; then
        sleep "$SLEEP_BETWEEN"
    fi
    if [ "x$UPDATE_WORDPRESS" = "xYES" ]; then
        SKIP_DOCKER=YES ./update.sh "$i"
    fi
done

# sudo service nginx reload
