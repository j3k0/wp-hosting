#!/bin/bash
. _scripts/base.sh
. config/keycdn
./node_scripts/run.sh keycdn-create-zone.js $(./shortcode.sh $PROJECT) $(./main-url.sh $PROJECT) cdn.${DOMAIN}
./cfcli.sh --type CNAME update ${BACKEND_CDN_DOMAIN} $(./shortcode.sh $PROJECT)-${KEYCDN_CDN_DOMAIN} || true
# TODO tell keycdn to manage a letsencrypt certificate for cdn.domain

echo You can now setup the cdn-enabler plugin to use cdn.${DOMAIN}

echo Want me to do it for you? y/N

read DO_IT

if [ "x$DO_IT" = "xy" ] || [ "x$DO_IT" = "xY" ]; then
    ./wp-cli.sh $PROJECT plugin install cdn-enabler
    ./wp-cli.sh $PROJECT option set cdn_enabler "{\"url\":\"cdn.${DOMAIN}\",\"dirs\":\"wp-content,wp-includes\",\"excludes\":\".php\",\"relative\":\"1\",\"https\":\"\",\"keycdn_api_key\":\"\",\"keycdn_zone_id\":\"\"}" --format=json
fi
