#!/bin/bash
if ! test -e ~/node-ovh-cdn; then
    git clone https://github.com/j3k0/node-ovh-cdn.git ~/node-ovh-cdn
    docker build -t ovhcdn ~/node-ovh-cdn
fi
. config/ovh

docker run --rm -it -e APP_KEY=$OVH_APP_KEY -e APP_SECRET=$OVH_APP_SECRET -e CONSUMER_KEY=$OVH_CONSUMER_KEY -e CDN_SERVICE_NAME=$OVH_CDN_SERVICE_NAME -e DEFAULT_BACKEND_IP=$OVH_DEFAULT_BACKEND_IP ovhcdn "$@"
