#!/bin/sh
< /dev/urandom tr -dc A-Za-z0-9 | head -c 24
echo
