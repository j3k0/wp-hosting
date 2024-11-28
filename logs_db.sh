#!/bin/bash
shopt -s expand_aliases

# Bold for timestamps (1;37 is bold white)
alias bold-grep="GREP_COLOR='1;37' grep -E --color=always --line-buffered"
alias grey-grep="GREP_COLOR='2;90' grep -E --color=always --line-buffered"
alias red-grep="GREP_COLOR='1;31' grep -E --color=always --line-buffered"
alias green-grep="GREP_COLOR='1;32' grep -E --color=always --line-buffered"
alias yellow-grep="GREP_COLOR='1;33' grep -E --color=always --line-buffered"
alias violet-grep="GREP_COLOR='1;35' grep -E --color=always --line-buffered"
alias cyan-grep="GREP_COLOR='1;36' grep -E --color=always --line-buffered"

. "$(dirname "$0")/_scripts/base.sh"
shift

if test -e $PROJECT/docker-compose.yml; then
    docker logs "$@" ${APPNAME}_db_1 2>&1 \
        | bold-grep "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z" \
        | green-grep "(\[Note\])|$" \
        | cyan-grep "(\[Info\])|$" \
        | yellow-grep "(\[Warning\])|$" \
        | red-grep "(\[ERROR\]|\[FATAL\])|$" \
        | grey-grep "(\[System\])|$" \
        | violet-grep "(\[Status\])|$"
fi 