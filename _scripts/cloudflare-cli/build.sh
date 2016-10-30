#!/bin/bash
cd "`dirname $0`"
if docker images | grep cloudflare-cli>/dev/null; then
    true
else
    docker build -t cloudflare-cli:latest .
fi
