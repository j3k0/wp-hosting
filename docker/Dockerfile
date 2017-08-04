FROM wordpress
RUN \
    export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install -y --no-install-recommends libmagickwand-dev ghostscript libfreetype6-dev && \
    pecl install imagick-3.4.1 && docker-php-ext-enable imagick && \
    docker-php-ext-install zip && \
    docker-php-ext-install mbstring && \
    rm -rf /var/lib/apt/lists/* && \
    echo DONE
