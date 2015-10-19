#!/bin/bash
set -e
docker run --rm -it -v "$(pwd)/weexrc:/weexrc" -v "$(pwd):/files" jeko/weex ftpback
