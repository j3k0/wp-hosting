#!/bin/bash
set -e
cd "$(dirname "$0")"

PROJECT="$1"
DOMAIN="$2"
TYPE="$3"

./create.sh "$PROJECT" "$DOMAIN" "$TYPE"
./initialize.sh "$PROJECT"
./start.sh "$PROJECT"

sudo service nginx reload

./info.sh "$PROJECT"
