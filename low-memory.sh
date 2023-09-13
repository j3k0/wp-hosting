#!/bin/bash
echo
echo 'Services with low memory (current mem_limit)'
echo '--------------------------------------------'
echo
docker stats --no-stream | awk '{ if ($6 + 0 > 80) print $1}' | xargs docker inspect -f '{{.Name}} memory {{.HostConfig.Memory}}' | awk '{ printf "%s %sM\n", $1, $3/(1024*1024) }'
echo
