#!/bin/bash
docker stats `docker inspect --format='{{.Name}}' $(sudo docker ps -aq --no-trunc)`
