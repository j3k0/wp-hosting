#!/bin/bash

. _scripts/base.sh

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

Please find below the credential for $DOMAIN

** Wordpress **

Website URL:
$WWW_URLS
** phpMyAdmin **

phpMyAdmin URL:
$PHPMYADMIN_URLS
phpMyAdmin Username: admin
phpMyAdmin Password: $ADMIN_PASSWORD

** SFTP **

SFTP Host: $PROJECT.ggs.ovh
SFTP Port: $SFTP_PORT
SFTP Username: admin
SFTP Password: $ADMIN_PASSWORD

** DNS **

For DNS setup, we will need the following:

$DOMAIN. A 46.105.198.84
www.$DOMAIN. CNAME www.$DOMAIN.web.cdn.anycast.me.
sftp.$DOMAIN. CNAME $PROJECT.ggs.ovh.
phpmyadmin.$DOMAIN. CNAME $PROJECT.ggs.ovh.

Please let me know if you have any questions.

EOF
