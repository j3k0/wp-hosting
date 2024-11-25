#!/bin/bash
cd "$(dirname "$0")"
for i in $(./ls.sh --enabled); do ./fix-permissions.sh "$i"; done
