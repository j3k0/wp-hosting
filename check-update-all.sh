#!/bin/bash
set -e

PROJECTS=$(./ls.sh --enabled)
for PROJECT in $PROJECTS; do
    printf "%32s ... " "$PROJECT"
    TYPE="$(cat "$PROJECT/config" | grep ^TYPE= | cut -d= -f2)"
    if [ "${TYPE:-wordpress}" = wordpress ]; then
        ./wp-cli.sh "$PROJECT" core check-update | grep 'Success' > /dev/null && echo OK || echo Update needed
    else
        echo "Not wordpress: $TYPE"
    fi
    sleep 1
done
