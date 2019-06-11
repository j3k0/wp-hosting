#!/bin/bash

. _scripts/base.sh
. config/base

WWW_HOSTS=`cat $PROJECT/nginx-site | grep www | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`
PHPMYADMIN_HOSTS=`cat $PROJECT/nginx-site | grep phpmyadmin | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`

for i in $WWW_HOSTS; do
WWW_URLS="$WWW_URLS - http://$i
"
done

for i in $PHPMYADMIN_HOSTS; do
PHPMYADMIN_URLS="$PHPMYADMIN_URLS - http://$i
"
done

cat << EOF

# $DOMAIN

** Wordpress **

Website URL:
$WWW_URLS
** phpMyAdmin **

phpMyAdmin URL:
$PHPMYADMIN_URLS
phpMyAdmin Username: admin
phpMyAdmin Password: $ADMIN_PASSWORD

** SFTP **

SFTP Host: $PROJECT.${BACKEND_DOMAIN}
SFTP Port: $SFTP_PORT
SFTP Username: admin
SFTP Password: $ADMIN_PASSWORD

** DNS **

$DOMAIN. A ${BACKEND_IP}
www.$DOMAIN. CNAME ${BACKEND_WWW_DOMAIN}.
cdn.$DOMAIN. CNAME ${BACKEND_CDN_DOMAIN}.

EOF
