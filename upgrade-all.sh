#!/bin/bash

for i in $(cat */docker-compose.yml | grep image | cut -d: -f2 | sort | uniq); do
    docker pull $i
done

docker pull $(cat docker/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/wordpress docker

docker pull $(cat phpmyadmin/Dockerfile | grep FROM | cut -d\  -f2)
docker build -t fovea/phpmyadmin phpmyadmin

for i in $(./ls.sh); do
    echo "$i ..."
    ./upgrade.sh "$i"
done

sudo service nginx reload
