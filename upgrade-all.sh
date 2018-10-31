#!/bin/bash

YES=$([ "x$1" = "x-y" ] || [ "x$1" == "x--yes" ] && echo "1" || echo "0")

for i in $(cat */docker-compose.yml | grep image | cut -d: -f2 | sort | uniq); do
    echo docker pull $i
    docker pull $i
done

docker pull $(cat docker/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/wordpress docker

docker pull $(cat phpmyadmin/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/phpmyadmin phpmyadmin

for i in $(./ls.sh); do
    if [ $YES == 1 ]; then
        echo "$i..."
        CONFIRM=y
    else
        echo "Upgrade $i? [y/n]"
        read CONFIRM
    fi
    if [ "x$CONFIRM" = "xy" ]; then
        ./upgrade.sh "$i"
    fi
    if [ "x$SLEEP_BETWEEN" != "x" ]; then
        sleep "$SLEEP_BETWEEN"
    fi
done

sudo service nginx reload
