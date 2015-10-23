#!/bin/bash
if [ "x$1" = "xstream" ]; then
	NO_STREAM=false
else
	NO_STREAM=true
fi
docker stats --no-stream=$NO_STREAM `docker inspect --format='{{.Name}}' $(sudo docker ps -aq --no-trunc)`
