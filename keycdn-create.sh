#!/bin/bash
. _scripts/base.sh
. config/keycdn

if [ "x$2" != "x--skip-dns" ]; then
    # Redirect domain to the keycdn
    ./cfcli.sh --type CNAME edit ${BACKEND_CDN_DOMAIN} $(./shortcode.sh $PROJECT)-${KEYCDN_CDN_DOMAIN} || true

    echo Wait for 10 minutes. DNS change propagation
    for secs in `seq 600 -1 1`; do
        printf "%02d:%02d" $(($secs/60)) $(($secs%60))
        echo -ne "\033[0K\r"
        sleep 1
    done
    echo
else
    shift
fi

# Create
if [ "x$2" == "x--skip-keycdn" ]; then
    shift
else
    ./node_scripts/run.sh keycdn-create-zone.js $(./shortcode.sh $PROJECT) $(./main-url.sh $PROJECT) cdn.${DOMAIN}
fi

if [ "x$TYPE" = "xwordpress" ]; then
    if [ "x$2" == "x--install-plugin" ]; then
        DO_IT=y
        shift
    elif [ "x$2" == "x--skip-plugin" ]; then
        DO_IT=n
        shift
    else
        echo You can now setup the cdn-enabler plugin to use cdn.${DOMAIN}
        echo Want me to do it for you? y/N
        read DO_IT
    fi

    if [ "x$DO_IT" = "xy" ] || [ "x$DO_IT" = "xY" ]; then
        ./wp-cli.sh $PROJECT plugin install cdn-enabler
        ./wp-cli.sh $PROJECT option set cdn_enabler "{\"url\":\"https://cdn.${DOMAIN}\",\"dirs\":\"wp-content,wp-includes\",\"excludes\":\".php\",\"relative\":\"1\",\"https\":\"1\",\"keycdn_api_key\":\"\",\"keycdn_zone_id\":\"\"}" --format=json
        ./wp-cli.sh $PROJECT plugin activate cdn-enabler
    fi
else
    echo "Website is not using wordpress, not much I can do here..."
fi
