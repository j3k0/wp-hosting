FROM wordpress
RUN \
    export DEBIAN_FRONTEND=noninteractive \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        libmagickwand-dev \
        ghostscript \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libmcrypt-dev \
        libpng12-dev \
        optipng \
        pngcrush \
    && docker-php-ext-install -j$(nproc) iconv mcrypt \
    && docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ \
    && docker-php-ext-install -j$(nproc) gd \
    && pecl install imagick-3.4.1 \
    && docker-php-ext-enable imagick \
    && docker-php-ext-install -j$(nproc) zip \
    && docker-php-ext-install -j$(nproc) mbstring \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /cache && chown www-data /cache && chmod 755 /cache \
    && echo DONE
