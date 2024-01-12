#!/bin/bash
set -e

HOSTNAME="${COLLECTD_HOSTNAME:-`hostname -f`}"
INTERVAL="${COLLECTD_INTERVAL:-10}"

while getopts "h:p:" c; do
  case $c in
    h)	HOSTNAME=$OPTARG;;
    p)	INTERVAL=$OPTARG;;
    *)	echo "Usage: $0 [-h <hostname>] [-p <seconds>]";;
  esac
done

cd "$(dirname "$0")"

while sleep "$INTERVAL"; do
	# du --bytes -s wp.*/volumes | awk -v interval=$INTERVAL -v hostname=$HOSTNAME '{ print "PUTVAL", hostname "/disk_usage-" $2 "/bytes interval=" interval " N:" $1 }' | sed s,/volumes/,/,g | sed s,\\.,-,g
	cat disk-usage.log | awk -v interval=$INTERVAL -v hostname=$HOSTNAME '{ print "PUTVAL", hostname "/disk_usage-" $2 "/bytes interval=" interval " N:" $1 }' | sed s,/volumes/,/,g | sed s,\\.,-,g
done
