#!/bin/bash

. _scripts/base.sh

echo "Recreate $PROJECT..."
if [ "$STATE" = "DISABLED" ]; then
	./docker-compose.sh $PROJECT stop || true
	./docker-compose.sh $PROJECT rm -vf || true
	docker network rm "${APPNAME}_default" || true
	exit 0
fi

./docker-compose.sh $PROJECT stop
./docker-compose.sh $PROJECT rm -vf
docker network rm "${APPNAME}_default"
./docker-compose.sh $PROJECT up -d
