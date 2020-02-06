#!/bin/bash
set -e

PROJECTS=$(./ls.sh --enabled)
for PROJECT in $PROJECTS; do
    printf "%32s ... " "$PROJECT"
    TYPE="$(grep ^TYPE= "$PROJECT/config" | cut -d= -f2)"
    if [ "${TYPE:-wordpress}" = wordpress ]; then
        ./wp-cli.sh "$PROJECT" core check-update | grep 'Success' > /dev/null && echo OK || echo Update needed
    else
        echo "Not wordpress: $TYPE"
    fi
    sleep 1
done
