#!/bin/bash

cat << EOF

wordpress:
  image: fovea/wordpress
  links:
    - db:mysql
    - mail:mail
  ports:
    - $WORDPRESS_PORT:80
  volumes:
    - ./php.ini:/usr/local/etc/php/php.ini
  volumes_from:
    - webdata
  environment:
    - WORDPRESS_DB_NAME=wordpress
    - WORDPRESS_DB_USER=admin
    - WORDPRESS_DB_PASSWORD=$ADMIN_PASSWORD
  restart: always
  mem_limit: 512M
  memswap_limit: 128M
  cpu_shares: 1024

db:
  image: mysql:5.6
  volumes_from:
    - dbdata
  environment:
    - MYSQL_ROOT_PASSWORD=$ROOT_PASSWORD
    - MYSQL_USER=admin
    - MYSQL_PASSWORD=$ADMIN_PASSWORD
    - MYSQL_DATABASE=wordpress
  restart: always
  mem_limit: 768M
  memswap_limit: 256M
  cpu_shares: 1024

mail:
  image: hectane/hectane:0.2.1
  volumes:
    - /data
  environment:
    - DISABLE_SSL_VERIFICATION=1
  restart: always
  mem_limit: 64M
  memswap_limit: 64M
  cpu_shares: 256

dbdata:
  image: busybox
  command: echo ready
  volumes:
    - /var/lib/mysql

webdata:
  image: busybox
  command: echo ready
  volumes:
    - /var/www/html

backup:
  image: jeko/wordpress-backup
  volumes:
    - ./backups:/backups
  volumes_from:
    - webdata
  links:
    - db:mysql
  restart: always
  mem_limit: 64M
  memswap_limit: 32M
  cpu_shares: 16

EOF

if [ "x$PLAYGROUND" != "x" ]; then
    exit 0
fi

cat << EOF

phpmyadmin:
  image: corbinu/docker-phpmyadmin
  links:
    - db:mysql
  environment:
    - MYSQL_USERNAME=root
    - MYSQL_PASSWORD=$ROOT_PASSWORD
    - PMA_SECRET=$SALT
    - PMA_USERNAME=admin
    - PMA_PASSWORD=$ADMIN_PASSWORD
  ports:
    - $PHPMYADMIN_PORT:80
  restart: always
  mem_limit: 128M
  memswap_limit: 128M
  cpu_shares: 256

sftp:
  image: jeko/sftp:latest
  volumes_from:
    - webdata
  ports:
    - "$SFTP_PORT:22"
  command: "admin:$ADMIN_PASSWORD:33::/var/www"
  restart: always
  mem_limit: 64M
  memswap_limit: 64M
  cpu_shares: 256

EOF
