#!/bin/bash

. _scripts/base.sh

WWW_HOSTS=`cat $PROJECT/nginx-site | grep www | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`
PHPMYADMIN_HOSTS=`cat $PROJECT/nginx-site | grep phpmyadmin | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`

for i in $WWW_HOSTS; do
WWW_URLS="$WWW_URLS - http://$i
"
done

for i in $PHPMYADMIN_HOSTS; do
PHPMYADMIN_URLS="http://$i $PHPMYADMIN_URLS"
done

cat << EOF

Please find below the credential for $PROJECT

** Wordpress **

Website URL:

$WWW_URLS
Wordpress Administrator:  admin
Wordpress admin Password: $ADMIN_PASSWORD

** phpMyAdmin **

phpMyAdmin URL:      $PHPMYADMIN_URLS
phpMyAdmin Username: admin
phpMyAdmin Password: $ADMIN_PASSWORD

** SFTP **

SFTP Host:     sftp.$PROJECT:$SFTP_PORT
SFTP Username: admin
SFTP Password: $ADMIN_PASSWORD

--

EOF
