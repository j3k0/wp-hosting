#!/bin/bash

YES=$([ "x$1" = "x-y" ] || [ "x$1" == "x--yes" ] && echo "1" || echo "0")

CONFIRMED_LIST=""

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

for i in $(cat */docker-compose.yml | grep image | cut -d: -f2 | sort | uniq); do
    echo docker pull $i
    docker pull $i
done

docker pull $(cat docker/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/wordpress docker

docker pull $(cat phpmyadmin/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/phpmyadmin phpmyadmin

echo
echo "Let's go!"
echo

for i in $CONFIRMED_LIST; do
    ./upgrade.sh "$i"
    if [ "x$SLEEP_BETWEEN" != "x" ]; then
        sleep "$SLEEP_BETWEEN"
    fi
done

sudo service nginx reload
