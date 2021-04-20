#!/bin/bash

if [ "x$1" = "x--help" ]; then
	cat << EOF

A single cron job for all the sites.
It'll run a "cron.sh" file in the project directory if it exists.

- makes moving sites from location to location easier.
- ensures cron jobs are backed up with the site data.

to install, add the below to your cron table with "crontab -e"

* * * * * /apps/wp-hosting/cron.sh

EOF
	exit 0
fi

cd "$(dirname "$0")"
N=0

for I in $(FILTER_ENABLED=1 ./ls.sh); do
	if test -x "$I/cron.sh"; then
		echo "--- CRON $I ---"
		"$I/cron.sh" &
		N=$((N + 1))
	fi
done

while [ $N -gt 0 ]; do
	wait
	N=$((N - 1))
done
