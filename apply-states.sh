#!/bin/bash
for i in $(./ls.sh); do
    state="$(< "$i/config" grep STATE= | cut -d= -f2)"
    echo "$i ..."
    if [ "x$state" == "xDISABLED" ]; then
        ./docker-compose.sh "$i" down -v
    else
        ./docker-compose.sh "$i" up -d
    fi
done
