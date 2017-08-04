#!/bin/bash

. _scripts/base.sh

# Add the PHP "zip" extension
function docker_php_ext_install() {
    docker exec -it ${APPNAME}_wordpress_1 sh -c "test -e /usr/local/lib/php/extensions/*/${1}.so || docker-php-ext-install $1"
}
docker_php_ext_install zip
docker_php_ext_install mbstring

# Add the Imagemagick extension
docker exec -it ${APPNAME}_wordpress_1 sh -c "test -e /usr/local/lib/php/extensions/*/imagick.so || (apt-get update && apt-get install -y --no-install-recommends libmagickwand-dev ghostscript libfreetype6-dev && rm -rf /var/lib/apt/lists/* && pecl install imagick-3.4.1 && docker-php-ext-enable imagick)"

