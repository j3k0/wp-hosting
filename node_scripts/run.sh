#!/bin/bash
cd "`dirname $0`"
. ../config/keycdn
echo configure... >&2
./configure.sh > /dev/null
echo run... >&2
if [ "x$1" == "x" ]; then
    docker run --rm -it node_scripts node help.js
else
    docker run --rm -it -e KEYCDN_KEY=$KEYCDN_KEY node_scripts node "$@"
fi
