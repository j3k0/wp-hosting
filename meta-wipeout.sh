#!/bin/bash

# Flatten-out incremental logs up to 30 days ago
for P in $(./ls.sh); do
do
    ./wipeout-30.sh $P
done
