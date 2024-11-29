#!/bin/bash
set -e

. _scripts/base.sh

echo "=== Setting up DNS records for project: $PROJECT ==="

echo "=== Extracting phpMyAdmin hosts ==="
PHPMYADMIN_HOSTS=`test -e $PROJECT/nginx-site && cat $PROJECT/nginx-site | grep phpmyadmin | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`
echo "Found phpMyAdmin hosts: $PHPMYADMIN_HOSTS"

echo "=== Creating main CNAME record ==="
echo "Adding CNAME: ${PROJECT}.${BACKEND_DOMAIN} -> ${PUBLIC_HOSTNAME}"
./cfcli.sh --type CNAME add "${PROJECT}.${BACKEND_DOMAIN}" "${PUBLIC_HOSTNAME}" || true

echo "=== Creating phpMyAdmin CNAME records ==="
for I in $PHPMYADMIN_HOSTS; do
    if echo "$I" | grep "${BACKEND_DOMAIN}.${BACKEND_DOMAIN}\$"; then
        DOM="$(echo "$I" | sed "s/.${BACKEND_DOMAIN}//")"
        echo "Adding CNAME: ${DOM} -> ${PUBLIC_HOSTNAME}"
        ./cfcli.sh --type CNAME add "${DOM}" "${PUBLIC_HOSTNAME}" || true
    fi
done

echo "=== Creating additional CNAME records ==="
echo "Adding CNAME: ${BACKEND_PMA_DOMAIN} -> ${PUBLIC_HOSTNAME}"
./cfcli.sh --type CNAME add "${BACKEND_PMA_DOMAIN}" "${PUBLIC_HOSTNAME}" || true

echo "Adding CNAME: ${BACKEND_WWW_DOMAIN} -> ${PUBLIC_HOSTNAME}"
./cfcli.sh --type CNAME add "${BACKEND_WWW_DOMAIN}" "${PUBLIC_HOSTNAME}" || true

echo "Adding CNAME: ${BACKEND_CDN_DOMAIN} -> ${PUBLIC_HOSTNAME}"
./cfcli.sh --type CNAME add "${BACKEND_CDN_DOMAIN}" "${PUBLIC_HOSTNAME}" || true

echo "=== DNS setup completed ==="

