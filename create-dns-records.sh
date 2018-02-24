#!/bin/bash
set -e

. _scripts/base.sh

./cfcli.sh --type CNAME add "${PROJECT}.${BACKEND_DOMAIN}" "$(hostname).${BACKEND_DOMAIN}" || true
# ./cfcli.sh --type CNAME add phpmyadmin.${PROJECT}.${BACKEND_DOMAIN} "$(hostname).${BACKEND_DOMAIN}" || true
./cfcli.sh --type CNAME add "${BACKEND_PMA_DOMAIN}" "$(hostname).${BACKEND_DOMAIN}" || true
./cfcli.sh --type CNAME add "${BACKEND_WWW_DOMAIN}" "$(hostname).${BACKEND_DOMAIN}" || true
./cfcli.sh --type CNAME add "${BACKEND_CDN_DOMAIN}" "$(hostname).${BACKEND_DOMAIN}" || true

