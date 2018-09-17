FROM wordpress:php7.1
RUN \
    export DEBIAN_FRONTEND=noninteractive \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ghostscript \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libmcrypt-dev \
        libpng-dev \
        zlib1g-dev \
        optipng \
        pngcrush \
        ca-certificates \
        curl \
        git \
        libmagickwand-dev  \
    && curl -Lsf 'https://storage.googleapis.com/golang/go1.8.3.linux-amd64.tar.gz' | tar -C '/usr/local' -xvzf - \
    && PATH=/usr/local/go/bin:$PATH go get github.com/mailhog/mhsendmail \
    && cp /root/go/bin/mhsendmail /usr/bin/mhsendmail \
    && docker-php-ext-install -j$(nproc) iconv mcrypt \
    && docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ \
    && docker-php-ext-install -j$(nproc) gd \
    && pecl install imagick-3.4.3 \
    && docker-php-ext-enable imagick \
    && docker-php-ext-install -j$(nproc) zip \
    && docker-php-ext-install -j$(nproc) mbstring \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /cache && chown www-data /cache && chmod 755 /cache \
    && echo '[mail function]' > /usr/local/etc/php/conf.d/ze-fovea-email.ini \
    && echo 'sendmail_path=/usr/bin/mhsendmail --smtp-addr smtp:25' >> /usr/local/etc/php/conf.d/ze-fovea-email.ini \
    && a2enmod ssl \
    && echo DONE
COPY ./https.conf /etc/apache2/sites-enabled/https.conf
