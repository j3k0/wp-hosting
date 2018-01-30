#!/bin/bash
set -e

PROJECT="$1"
test ! -z "$PROJECT"

echo "before cleanup..."
echo "transients:"
./mysql.sh "$PROJECT" -e "SELECT count(*) as num_transients FROM wp_options WHERE option_name LIKE '_transient%'"
echo "transients:"
./mysql.sh "$PROJECT" -e "SELECT count(*) as num_site_transients FROM wp_options WHERE option_name LIKE '_site_transient%'"

./mysql.sh "$PROJECT" -e "DELETE FROM wp_options WHERE option_name LIKE '_transient%'"

echo "after cleanup..."
echo "transients:"
./mysql.sh "$PROJECT" -e "SELECT count(*) as num_transients FROM wp_options WHERE option_name LIKE '_transient%'"
echo "transients:"
./mysql.sh "$PROJECT" -e "SELECT count(*) as num_site_transients FROM wp_options WHERE option_name LIKE '_site_transient%'"
