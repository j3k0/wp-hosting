#!/bin/bash
set -e
cd "$(dirname "$0")"

PROJECT=
APPNAME=

function git_copy() {
    FROM=$1
    TO=$2
    docker run --rm -it \
        -v ${PWD}/../volumes/html:/dest \
        -v ${PWD}:/src \
        jeko/rsync-client \
        -rv --delete \
        --exclude=.git \
        /src/$FROM/ /dest/$TO
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
    git fetch
    git checkout $GIT_REPO_BRANCH
    git pull
    GIT_REPO_COPY
    cd ..
    cd ..
}

if [ "x$1" = x ]; then
    echo "Do you really want to synchronize ALL projects? (type YES if you are)"
    read SURE
    if [ "x$SURE" != "xYES" ]; then
        exit 1
    fi
    PROJECTS="$(echo wp.*/git-repo | sed "s/\\/git-repo//g")"
else
    PROJECTS="$1"
fi

for PROJECT in $PROJECTS; do
    # PROJECT="$(dirname $i)"
    if [ -e $PROJECT/git-repo ]; then
        echo Project $PROJECT has a git repo. Syncing...
        git_sync $PROJECT
        ./fix-permissions.sh $PROJECT
    fi
done
