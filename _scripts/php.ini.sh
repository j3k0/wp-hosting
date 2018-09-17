#!/bin/bash

cat << EOF
[PHP]
upload_max_filesize = 32M
post_max_size = 32M

display_errors = Off
log_errors = On
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
max_input_time = 300
max_execution_time = 300
output_buffering = 4096
register_argc_argv = Off
request_order = "GP"
session.gc_divisor = 1000
session.hash_bits_per_character = 5
short_open_tag = Off
url_rewriter.tags = "a=href,area=href,frame=src,input=src,form=fakeentry"
variables_order = "GPCS"

; extension=imagick.so
; extension=mbstring.so
;
; [mail function]
; sendmail_path=/usr/bin/mhsendmail --smtp-addr smtp:25
EOF
