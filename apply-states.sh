#!/bin/bash
set -e
for PROJECT in $(./ls.sh); do
    ./apply-state.sh "$PROJECT"
done
# sudo service nginx reload
