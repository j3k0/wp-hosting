#!/bin/bash
if [ "x$1" = 'x--help' ]; then
    echo "usage: $0 [project directory]..."
    echo
    echo "example: $0 *"
    exit 0
fi
(
for domain in $(
(for i in "$@"; do
    test -e "$i/nginx-site" && cat "$i/nginx-site" | grep -P '^[ \t]+server_name' | head -1
done) | cut -d# -f1 | sed 's/server_name//g' | sed 's/;/ /g' | paste -s -d"," - | sed 's/,/ /g' | sed 's/[a-z0-9.-]*\.ggs\.ovh//g'
); do
    echo $domain
done
) | sort | uniq | xargs echo
