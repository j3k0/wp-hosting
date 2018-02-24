#!/bin/bash
which ovh > /dev/null || sudo pip install ovhcli
ovh "$@"
