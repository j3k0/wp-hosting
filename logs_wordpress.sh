#!/bin/bash
shopt -s expand_aliases

alias grey-grep="GREP_COLOR='2;90' grep -E --color=always --line-buffered"
alias red-grep="GREP_COLOR='1;31' grep -E --color=always --line-buffered"
alias green-grep="GREP_COLOR='1;32' grep -E --color=always --line-buffered"
alias yellow-grep="GREP_COLOR='1;33' grep -E --color=always --line-buffered"
alias violet-grep="GREP_COLOR='1;35' grep -E --color=always --line-buffered"
alias cyan-grep="GREP_COLOR='1;36' grep -E --color=always --line-buffered"

. _scripts/base.sh
shift

if test -e $PROJECT/docker-compose.yml; then
    docker logs "$@" ${APPNAME}_wordpress_1 2>&1 \
        | green-grep "\"(GET|POST|HEAD|PUT|OPTIONS) [^\"]+\" 2[0-9]+|$" \
        | grey-grep ".*/robots\.txt.*|$" \
        | grey-grep ".*/wp-cron\.php.*|$" \
        | grey-grep ".*/wp-load\.php.*|$" \
        | cyan-grep "INFO|$" \
        | yellow-grep "WARN|$" \
        | red-grep "\[ERROR\].*|\[FATAL\].*|\[[^]]*error\].*|$" \
        | violet-grep "\[[^]]*notice\].*|$" \
        | cyan-grep "\"(GET|POST|HEAD|PUT|OPTIONS) [^\"]+\" 3[0-9]+|$" \
        | yellow-grep "\"(GET|POST|HEAD|PUT|OPTIONS) [^\"]+\" 4[0-9]+|$" \
        | red-grep "\"(GET|POST|HEAD|PUT|OPTIONS) [^\"]+\" 5[0-9]+|$" \
        | grey-grep "\"[^\"]*\"$|$" \

fi
