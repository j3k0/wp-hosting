#!/bin/bash

. "$(dirname "$0")/../config/base"

if [ -z "$BACKEND_PMA_DOMAIN" ]; then
    . "$(dirname "$0")/base.sh"
fi


PREEXT=$(echo $DOMAIN | cut -d. -f2)
EXT=$(echo $DOMAIN | cut -d. -f3)
if [ "x$EXT" = "x" ] || [ ${#PREEXT} -le 2 ]; then
    WWW_DOMAIN=www.$DOMAIN
else
    WWW_DOMAIN=
fi

ROOT_DIR="${ROOT_DIR:-/apps/wp-hosting}"
SSL_DIR="${SSL_DIR:-$ROOT_DIR/$PROJECT/ssl}"
CONFIG_DIR="${CONFIG_DIR:-$ROOT_DIR/config}"

cat << EOF

# ${DOMAIN}
server {
	listen 80;
        listen [::]:80;
	client_max_body_size 32m;
	server_name ${DOMAIN} ${WWW_DOMAIN} ${BACKEND_WWW_DOMAIN};
	location ~ /\.git {
		deny all;
	}
	location / {
		proxy_pass http://www-backend:$WORDPRESS_PORT;
		include ${CONFIG_DIR}/nginx_proxy_params;
	}
	location /wp-content/upload/ {
		proxy_pass http://www-backend:$WORDPRESS_PORT;
		include ${CONFIG_DIR}/nginx_proxy_params_static;
	}
	location = /wp-login.php {
		# limit_req zone=one burst=1 nodelay;
		proxy_pass http://www-backend:$WORDPRESS_PORT;
		include ${CONFIG_DIR}/nginx_proxy_params;
	}
	include ${CONFIG_DIR}/nginx_ssl_params;
	include ${CONFIG_DIR}/nginx_gzip;
	# listen 443 ssl http2;
	# ssl_certificate ${SSL_DIR}/nginx.crt;
	# ssl_certificate_key ${SSL_DIR}/nginx.key;
}

# ${BACKEND_PMA_DOMAIN}
server {
	listen 80;
	listen [::]:80;
	client_max_body_size 32m;
	server_name ${BACKEND_PMA_DOMAIN};
	location / {
		proxy_pass http://www-backend:$PHPMYADMIN_PORT;
		include ${CONFIG_DIR}/nginx_proxy_params;
	}
	include ${CONFIG_DIR}/nginx_ssl_params;
	include ${CONFIG_DIR}/nginx_gzip;
	# listen 443 ssl http2;
	# ssl_certificate ${SSL_DIR}/nginx.crt;
	# ssl_certificate_key ${SSL_DIR}/nginx.key;
}

EOF

