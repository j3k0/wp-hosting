#!/bin/bash
set -e
cd "$(dirname "$0")"

PROJECT="$1"
DOMAIN="$2"

./create.sh "$PROJECT" "$DOMAIN"
./initialize.sh "$PROJECT"
./start.sh "$PROJECT"

sudo service nginx reload

./info.sh "$PROJECT"
