#!/bin/bash

set -e
cd "$(dirname "$0")"

if [ ! -e cfcli.yml ]; then
    echo "cfcli not configured. please create cfcli.yml"
    exit 1
fi

docker run --rm -t -v "$(pwd)/cfcli.yml:/cfcli.yml" anjuna/cfcli --config /cfcli.yml "$@"
