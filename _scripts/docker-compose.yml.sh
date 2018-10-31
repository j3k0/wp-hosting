#!/bin/bash

if [ "x$PROJECT" = "x" ]; then
    echo "PROJECT is not defined"
    exit 1
fi

SUBNET="`./subnet.sh $PROJECT`"
HOST_HOSTNAME="$(hostname -A)"

cat << EOF
version: '2.2'

networks:
  mailnet:
    external: true
  default:
    driver: bridge
    ipam:
      config:
        - subnet: "$SUBNET"

services:

  wordpress:
    image: fovea/wordpress
    links:
      - db:mysql
    networks:
      - mailnet
      - default
    hostname: $HOST_HOSTNAME
    ports:
      - $WORDPRESS_PORT:80
    volumes:
      - ./php.ini:/usr/local/etc/php/php.ini
      - ./volumes/html:/var/www/html
      - ./ssl:/ssl
    environment:
      - WORDPRESS_DB_NAME=wordpress
      - WORDPRESS_DB_USER=admin
      - WORDPRESS_DB_PASSWORD=$ADMIN_PASSWORD
    restart: always
    mem_limit: 512M
    memswap_limit: 128M
    cpu_shares: 1024
    cpus: 1.0

  db:
    image: mysql:5.6
    volumes:
      - ./volumes/mysql:/var/lib/mysql
    networks:
      - default
    environment:
      - MYSQL_ROOT_PASSWORD=$ROOT_PASSWORD
      - MYSQL_USER=admin
      - MYSQL_PASSWORD=$ADMIN_PASSWORD
      - MYSQL_DATABASE=wordpress
    restart: always
    mem_limit: 768M
    memswap_limit: 256M
    cpu_shares: 1024
    cpus: 1.0

  backup:
    image: jeko/wordpress-backup
    volumes:
      - /backups/$PROJECT:/backups
      - ./volumes/html:/var/www/html
    networks:
      - default
    links:
      - db:mysql
    environment:
      - MYSQL_ENV_MYSQL_USER=admin
      - MYSQL_ENV_MYSQL_PASSWORD=$ADMIN_PASSWORD
      - MYSQL_ENV_MYSQL_DATABASE=wordpress
      - MYSQL_PORT_3306_TCP_ADDR=mysql
      - MYSQL_PORT_3306_TCP_PORT=3306
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
    image: fovea/phpmyadmin
    depends_on:
      - db
    networks:
      - default
    environment:
      - PMA_HOST=db
      - PMA_VERBOSE=MySQL
    ports:
      - $PHPMYADMIN_PORT:80
    restart: always
    mem_limit: 128M
    memswap_limit: 128M
    cpu_shares: 256
    volumes:
      - ./volumes/phpmyadmin/sessions:/sessions
      - ./volumes/phpmyadmin/.well-known/acme-challenge:/www/.well-known/acme-challenge
  sftp:
    image: jeko/sftp:latest
    volumes:
      - ./volumes/html:/var/www/html
      - /etc/ssh/ssh_host_dsa_key.pub:/etc/ssh/ssh_host_dsa_key.pub:ro
      - /etc/ssh/ssh_host_ecdsa_key.pub:/etc/ssh/ssh_host_ecdsa_key.pub:ro
      - /etc/ssh/ssh_host_ed25519_key.pub:/etc/ssh/ssh_host_ed25519_key.pub:ro
      - /etc/ssh/ssh_host_rsa_key.pub:/etc/ssh/ssh_host_rsa_key.pub:ro
      - /etc/ssh/ssh_host_dsa_key:/etc/ssh/ssh_host_dsa_key:ro
      - /etc/ssh/ssh_host_ecdsa_key:/etc/ssh/ssh_host_ecdsa_key:ro
      - /etc/ssh/ssh_host_ed25519_key:/etc/ssh/ssh_host_ed25519_key:ro
      - /etc/ssh/ssh_host_rsa_key:/etc/ssh/ssh_host_rsa_key:ro
    ports:
      - "$SFTP_PORT:22"
    command: "admin:$ADMIN_PASSWORD:33::/var/www"
    restart: always
    mem_limit: 64M
    memswap_limit: 64M
    cpu_shares: 256

EOF
