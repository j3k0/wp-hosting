#!/bin/bash
if test ! -z $1 && test -e "$1/config"; then
    . "$1/config"
fi
cat << EOF
version: '2.2'
# type: $TYPE
EOF
if [ "x$TYPE" = "xphp" ]; then
cat << EOF
services:
  wordpress:
    entrypoint: docker-php-entrypoint
    command: apache2-foreground
EOF

if [ "x$DATABASE" = "xNO" ]; then
cat << EOF
  db:
    image: alpine:latest
    command: "true"
    entrypoint: "true"
  backup:
    image: alpine:latest
    command: "true"
    entrypoint: "true"
  phpmyadmin:
    image: alpine:latest
    command: "true"
    entrypoint: "true"
EOF
fi
fi
