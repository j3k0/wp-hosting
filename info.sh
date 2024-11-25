#!/bin/bash

cd "$(dirname "$0")"

. _scripts/base.sh
. config/base

# Get website state
if grep STATE=DISABLED $1/config > /dev/null; then
    SITE_STATE="disabled"
else
    SITE_STATE="enabled"
fi

# Generate website URLs
WWW_URLS="- https://$DOMAIN
- https://${BACKEND_WWW_DOMAIN}"

PHPMYADMIN_URLS="- https://$BACKEND_PMA_DOMAIN"

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

** State **
$SITE_STATE

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
