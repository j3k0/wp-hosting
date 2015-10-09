#!/bin/bash
cat << EOF

wordpress:
  image: wordpress
  links:
    - db:mysql
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
  image: mysql/mysql-server
  restart: always
  volumes_from:
    - dbdata
  environment:
    - MYSQL_ROOT_PASSWORD=$ROOT_PASSWORD
    - MYSQL_USER=admin
    - MYSQL_PASSWORD=$ADMIN_PASSWORD
    - MYSQL_DATABASE=wordpress

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
