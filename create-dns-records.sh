#!/bin/bash
set -e

. _scripts/base.sh

PHPMYADMIN_HOSTS=`test -e $PROJECT/nginx-site && cat $PROJECT/nginx-site | grep phpmyadmin | grep server_name | sort | uniq | cut -d\; -f1 | awk '{print $2, $3, $4}'`

./cfcli.sh --type CNAME add "${PROJECT}.${BACKEND_DOMAIN}" "${PUBLIC_HOSTNAME}" || true
for I in $PHPMYADMIN_HOSTS; do
	if echo "$I" | grep "${BACKEND_DOMAIN}.${BACKEND_DOMAIN}\$"; then
		DOM="$(echo "$I" | sed "s/.${BACKEND_DOMAIN}//")"
		./cfcli.sh --type CNAME add "${DOM}" "${PUBLIC_HOSTNAME}" || true
	fi
done
./cfcli.sh --type CNAME add "${BACKEND_PMA_DOMAIN}" "${PUBLIC_HOSTNAME}" || true
./cfcli.sh --type CNAME add "${BACKEND_WWW_DOMAIN}" "${PUBLIC_HOSTNAME}" || true
./cfcli.sh --type CNAME add "${BACKEND_CDN_DOMAIN}" "${PUBLIC_HOSTNAME}" || true

