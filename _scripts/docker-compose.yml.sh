#!/bin/bash

cat << EOF

wordpress:
  image: wordpress
  links:
    - db:mysql
    - mail:mail
  ports:
    - $WORDPRESS_PORT:80
  volumes_from:
    - webdata
  restart: always
  environment:
    - WORDPRESS_DB_NAME=wordpress
    - WORDPRESS_DB_USER=admin
    - WORDPRESS_DB_PASSWORD=$ADMIN_PASSWORD

phpmyadmin:
  image: corbinu/docker-phpmyadmin
  restart: always
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

sftp:
  image: jeko/sftp:latest
  restart: always
  volumes_from:
    - webdata
  ports:
    - "$SFTP_PORT:22"
  command: "admin:$ADMIN_PASSWORD:33::/var/www"

backup:
  image: aveltens/wordpress-backup
  volumes:
    - ./backups:/backups
  volumes_from:
    - webdata
  links:
    - db:mysql
  restart: always

db:
  image: mysql:5.6
  restart: always
  volumes_from:
    - dbdata
  environment:
    - MYSQL_ROOT_PASSWORD=$ROOT_PASSWORD
    - MYSQL_USER=admin
    - MYSQL_PASSWORD=$ADMIN_PASSWORD
    - MYSQL_DATABASE=wordpress

mail:
  image: hectane/hectane:0.2.1
  restart: always

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

EOF
