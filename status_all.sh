#!/bin/bash
for i in `./ls.sh`; do ./status.sh $i || echo $i is NOT OK; done
