#!/bin/bash

set -e
cd "$(dirname "$0")"
if [ "x$1" = "x" ] || [ "x$2" = "x" ]; then
    echo "Usage: $0 <project> <domain>"
    echo
    echo "Generate a project with a sample config file: $PROJECT/config"
    exit 1
fi
export PROJECT="$1"
export DOMAIN="$2"

if [ "_$(echo "$PROJECT" | cut -d. -f1)" != _wp ]; then
    echo "Project name must start with wp."
    exit 1
fi

if test -e "$PROJECT/config"; then
    echo "ERROR: project already has a config file. $PROJECT/config"
    exit 1
fi

mkdir -p "$PROJECT"
./_scripts/config.sh > "$PROJECT/config"

# Create SSL certificates (if it doesn't exist)
if test ! -e "$PROJECT/ssl"; then
    mkdir "$PROJECT/ssl"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$PROJECT/ssl/nginx.key" -out "$PROJECT/ssl/nginx.crt"
fi

echo "You can now initialize the server with the folowing command:"
echo
echo "    ./initialize.sh $PROJECT"
echo
