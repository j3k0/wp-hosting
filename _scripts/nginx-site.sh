#!/bin/bash

PREEXT=$(echo $DOMAIN | cut -d. -f2)
EXT=$(echo $DOMAIN | cut -d. -f3)
if [ "x$EXT" = "x" ] || [ ${#PREEXT} -le 2 ]; then
    WWW_DOMAIN=www.$DOMAIN
else
    WWW_DOMAIN=
fi

cat << EOF

server {
	listen 80;
	client_max_body_size 32m;
	server_name ${DOMAIN} ${WWW_DOMAIN} ${BACKEND_WWW_DOMAIN};
    location ~ /\.git {
        deny all;
    }
	location / {
		proxy_pass http://127.0.0.1:$WORDPRESS_PORT;
        include ${PWD}/config/nginx_proxy_params;
	}
    location /wp-content/upload/ {
        proxy_pass http://127.0.0.1:$WORDPRESS_PORT;
        include ${PWD}/config/nginx_proxy_params_static;
    }

    listen 443 ssl;
    include ${PWD}/config/nginx_ssl_params;
    ssl_certificate ${PWD}/${PROJECT}/ssl/nginx.crt;
    ssl_certificate_key ${PWD}/${PROJECT}/ssl/nginx.key;
    include ${PWD}/config/nginx_gzip;
}

server {
	listen 80;
	client_max_body_size 32m;
	server_name ${BACKEND_PMA_DOMAIN};
	location / {
		proxy_pass http://127.0.0.1:$PHPMYADMIN_PORT;
        include ${PWD}/config/nginx_proxy_params;
	}

    listen 443 ssl;
    include ${PWD}/config/nginx_ssl_params;
    ssl_certificate ${PWD}/${PROJECT}/ssl/nginx.crt;
    ssl_certificate_key ${PWD}/${PROJECT}/ssl/nginx.key;
    include ${PWD}/config/nginx_gzip;
}

EOF
