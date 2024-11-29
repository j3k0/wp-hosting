#!/bin/bash

set -e
cd "$(dirname "$0")"

if [ ! -e cfcli.yml ]; then
    echo "cfcli not configured. please create cfcli.yml"
    exit 1
fi

echo "Running cfcli command: $@"
echo "Using config file: $(pwd)/cfcli.yml"

# Run the command and capture output
output=$(docker run --rm -t -v "$(pwd)/cfcli.yml:/cfcli.yml" anjuna/cfcli --config /cfcli.yml "$@" 2>&1)
exit_code=$?

# Print the output
echo "Command output:"
echo "$output"

# Exit with the same code as the docker command
if [ $exit_code -ne 0 ]; then
    echo "Command failed with exit code: $exit_code"
fi
exit $exit_code
