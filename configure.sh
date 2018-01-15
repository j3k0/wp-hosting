#!/bin/bash
mkdir -p config
test -e config/dhparams.pem || openssl dhparam -out config/dhparams.pem 2048
./_scripts/nginx_ssl_params.sh > config/nginx_ssl_params

cd mail
docker-compose up -d
cd ..

docker build -t node_scripts node_scripts
docker build -t fovea/wordpress docker
