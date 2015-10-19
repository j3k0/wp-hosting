#!/bin/bash

cat << EOF

server {
	listen 80;
	server_name $PROJECT www.$PROJECT;
	location / {
		proxy_pass http://127.0.0.1:$WORDPRESS_PORT;
                include /etc/nginx/proxy_params;
	}
}

server {
	listen 80;
	server_name phpmyadmin.$PROJECT;
	location / {
		proxy_pass http://127.0.0.1:$PHPMYADMIN_PORT;
                include /etc/nginx/proxy_params;
	}
}

EOF
