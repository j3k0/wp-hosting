FROM phpmyadmin/phpmyadmin
RUN cat /etc/nginx.conf | head -n -2 > /tmp/nginx.conf \
    && echo '        location ^~ /.well-known/acme-challenge/ {' >> /tmp/nginx.conf \
    && echo '            allow all;' >> /tmp/nginx.conf \
    && echo '            default_type "text/plain";' >> /tmp/nginx.conf \
    && echo '        }' >> /tmp/nginx.conf \
    && echo '    }' >> /tmp/nginx.conf \
    && echo '}' >> /tmp/nginx.conf \
    && mv /tmp/nginx.conf /etc/nginx.conf
VOLUME /www/.well-known/acme-challenge
