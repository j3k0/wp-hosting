#!/bin/bash
echo
echo "Disk usage:"
echo "-----------"
df -h / /backups/ /meta-backup/ | awk '{printf "    %-14s %s\n", $6, $5}' | grep -E '[0-9]+%'
echo
echo "Memory:"
echo "-------"
free -h | grep buffers/cache | cut -d: -f2 | awk 'BEGIN{print "    Used   Free"} {printf "    %4s   %4s\n", $1, $2}'
echo
