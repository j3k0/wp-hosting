#!/bin/sh
. _scripts/base.sh
echo $PROJECT | md5sum | cut -c 1-20
