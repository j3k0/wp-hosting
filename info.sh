#!/bin/bash

cd "$(dirname "$0")"

. _scripts/base.sh
. config/base

WWW_HOSTS=`cat $PROJECT/nginx-site | grep www | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`
PHPMYADMIN_HOSTS=`cat $PROJECT/nginx-site | grep phpmyadmin | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`

for i in $WWW_HOSTS; do
WWW_URLS="$WWW_URLS - http://$i
"
done

for i in $PHPMYADMIN_HOSTS; do
PHPMYADMIN_URLS="$PHPMYADMIN_URLS - https://$i
"
done

# Check if domain is a subdomain
is_subdomain() {
    local domain=$1
    if [[ $(echo "$domain" | grep -o "\." | wc -l) -gt 1 ]]; then
        return 0 # true
    else
        return 1 # false
    fi
}

# Generate DNS configuration
if is_subdomain "$DOMAIN"; then
    # For subdomains, use CNAME
    DNS_CONFIG="$DOMAIN. CNAME ${BACKEND_WWW_DOMAIN}."
else
    # For root domains, use A record and additional CNAMEs
    DNS_CONFIG="$DOMAIN. A ${BACKEND_IP}
www.$DOMAIN. CNAME ${BACKEND_WWW_DOMAIN}."
    # cdn.$DOMAIN. CNAME ${BACKEND_CDN_DOMAIN}.
fi

cat << EOF

# $DOMAIN

** Website URL **

$WWW_URLS
** phpMyAdmin **

$PHPMYADMIN_URLS
phpMyAdmin Username: admin
phpMyAdmin Password: $ADMIN_PASSWORD

** SFTP **

SFTP Host: $SFTP_HOSTNAME
SFTP Port: $SFTP_PORT
SFTP Username: admin
SFTP Password: $ADMIN_PASSWORD

** DNS **

\`\`\`
$DNS_CONFIG
\`\`\`

EOF
