#!/bin/bash

set -e
cd "$(dirname "$0")"
if [ "x$1" = "x" ] || [ "x$2" = "x" ] || [ "x$3" = "x" ]; then
    echo "Usage: $0 <project> <domain> <type>"
    echo
    echo "Generate a project with a sample config file: $PROJECT/config"
    echo
    echo "Type can be 'wordpress' or 'php'."
    echo
    exit 1
fi
export PROJECT="$1"
export DOMAIN="$2"
export TYPE="$3"

echo "=== Validating project name ==="
if [ "_$(echo "$PROJECT" | cut -d. -f1)" != _wp ]; then
    echo "Project name must start with wp."
    exit 1
fi

echo "=== Checking for existing project ==="
if test -e "$PROJECT/config"; then
    echo "ERROR: project already has a config file. $PROJECT/config"
    exit 1
fi

echo "=== Checking for domain conflicts ==="
if ./ls.sh | awk '{print $1 "/config"}' | xargs grep -l "DOMAIN=$DOMAIN" > /dev/null; then
    echo "ERROR: Domain $DOMAIN is already in use by another project"
    echo "Found in:"
    ./ls.sh | awk '{print $1 "/config"}' | xargs grep -l "DOMAIN=$DOMAIN"
    exit 1
fi

echo "=== Creating project directory ==="
mkdir -p "$PROJECT"
./_scripts/config.sh > "$PROJECT/config"

echo "=== Setting up SSL certificates ==="
if test ! -e "$PROJECT/ssl"; then
    mkdir "$PROJECT/ssl"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$PROJECT/ssl/nginx.key" \
        -out "$PROJECT/ssl/nginx.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

echo "=== Project created successfully ==="
echo "You can now initialize the server with the following command:"
echo
echo "    ./initialize.sh $PROJECT"
echo
