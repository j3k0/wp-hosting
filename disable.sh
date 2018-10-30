#!/bin/bash

. _scripts/base.sh
. config/base

echo "Updating $PROJECT/config ..."
sed -i.bak 's/STATE=ENABLED/STATE=DISABLED/' "$PROJECT/config"
if ! grep STATE=DISABLED "$PROJECT/config"; then
    echo >> "$PROJECT/config"
    echo STATE=DISABLED >> "$PROJECT/config"
fi

echo "Applying state"
./apply-state.sh "$PROJECT"


