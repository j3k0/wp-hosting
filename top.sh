#!/bin/bash
docker stats --no-stream=true `docker inspect --format='{{.Name}}' $(sudo docker ps -aq --no-trunc)`
