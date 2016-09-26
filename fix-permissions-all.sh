#!/bin/bash
for i in */nginx-site; do ./fix-permissions.sh `dirname $i`; done
