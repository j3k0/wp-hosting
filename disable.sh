#!/bin/bash

cd "$(dirname "$0")"
set -e

. _scripts/base.sh
. config/base

# Check if state parameter is provided
if [ $# -eq 2 ] && [ "$2" = "--enable" ]; then
    NEW_STATE="ENABLED"
    OLD_STATE="DISABLED"
else
    NEW_STATE="DISABLED"
    OLD_STATE="ENABLED"
fi

echo "Updating $PROJECT/config to $NEW_STATE..."
sed -i.bak "s/STATE=$OLD_STATE/STATE=$NEW_STATE/" "$PROJECT/config"
if ! grep "STATE=$NEW_STATE" "$PROJECT/config"; then
    echo >> "$PROJECT/config"
    echo "STATE=$NEW_STATE" >> "$PROJECT/config"
fi

echo "Applying state"
./apply-state.sh "$PROJECT"


