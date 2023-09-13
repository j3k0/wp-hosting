#!/bin/bash
# set -e

# build docker images
# ./upgrade-all.sh --sites ""

PROJECTS_BY_SUBNET=$(
for PROJECT in $(./ls.sh); do
	echo "$(./subnet.sh $PROJECT | cut -d. -f3):$PROJECT";
done | sort -n | cut -d: -f2
)

for PROJECT in $PROJECTS_BY_SUBNET; do
	echo "./recreate.sh $PROJECT ? (y/n)"
	read RECREATE
	echo "./upgrade.sh $PROJECT ? (y/n)"
	read UPGRADE
	if [ "$RECREATE" = "y" ]; then
		./recreate.sh $PROJECT
	fi
	if [ "$UPGRADE" = "y" ]; then
		./upgrade.sh $PROJECT
	fi
done
