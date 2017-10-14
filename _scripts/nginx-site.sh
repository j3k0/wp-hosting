#!/bin/bash

cat << EOF

server {
	listen 80;
	client_max_body_size 32m;
	server_name ${DOMAIN} www.${DOMAIN} ${PROJECT}.ggs.ovh;
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
	server_name phpmyadmin.${DOMAIN} phpmyadmin.${PROJECT}.ggs.ovh;
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
