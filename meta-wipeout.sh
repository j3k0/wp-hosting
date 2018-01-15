#!/bin/bash

# Flatten-out incremental logs up to 30 days ago
for P in $(./ls.sh); do
    echo $P ...
    ./wipeout-30.sh $P || true
done
