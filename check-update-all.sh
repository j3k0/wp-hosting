#!/bin/bash
set -e

PROJECTS=$(./ls.sh)
for PROJECT in $PROJECTS; do
    printf "%32s ... " "$PROJECT"
    ./wp-cli.sh "$PROJECT" core check-update | grep 'Success' > /dev/null && echo OK || echo Update needed
done
