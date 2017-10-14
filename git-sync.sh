#!/bin/bash
set -e
cd "`dirname $0`"

PROJECT=
APPNAME=

function git_copy() {
    FROM=$1
    TO=$2
    docker run --rm -it \
        --volumes-from=${APPNAME}_webdata_1 \
        -v ${PWD}:/src \
        jeko/rsync-client \
        -av --delete \
        --exclude=.git \
        /src/$FROM/ /var/www/html/$TO
}

function git_sync() {
    PROJECT=$1
    APPNAME=`echo $PROJECT | sed s/\\\\.//g | sed s/-//g`
    cd $PROJECT
    GIT_REPO_URL=
    GIT_REPO_BRANCH=
    GIT_REPO_COPY=
    . git-repo
    if test ! -e git-files; then
        git clone $GIT_REPO_URL git-files
    fi
    cd git-files
    git checkout $GIT_REPO_BRANCH
    git pull
    GIT_REPO_COPY
    cd ..
    cd ..
}

for i in wp.*/git-repo; do
    PROJECT=`dirname $i`
    echo Project $PROJECT has a git repo. Syncing...
    git_sync $PROJECT
done
