#!/bin/bash
set -e
cd "`dirname $0`"
P1=`./password.sh`
P2=`./password.sh`
P3=`./password.sh`

LAST_PORT="`cat ../*/config|grep _PORT|cut -d= -f2|sort -n|tail -1 || echo 8300`"
BASE_PORT=$((LAST_PORT + 8))
WORDPRESS_PORT=$((BASE_PORT + 0))
PHPMYADMIN_PORT=$((BASE_PORT + 1))
SFTP_PORT=$((BASE_PORT + 2))

cat << EOF
WORDPRESS_PORT=$WORDPRESS_PORT
PHPMYADMIN_PORT=$PHPMYADMIN_PORT
SFTP_PORT=$SFTP_PORT

ROOT_PASSWORD=$P1
ADMIN_PASSWORD=$P2

SALT=$P3
EOF
