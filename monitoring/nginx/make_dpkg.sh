#!/bin/bash -ex

set -e

cd "$(dirname "$0")"
WORKSPACE="$(pwd)"

if [ ! -e "/etc/apt/sources.list.d/nginx.list" ]; then
  echo "ERROR! This build slave isn't configured with the nginx apt mirror! (see: http://wiki.nginx.org/Install)"
  exit 1
fi

apt-get source nginx

cd $WORKSPACE/nginx-*/debian/

# Increment the package version by updating the changelog
cat > changelog <<EOF
nginx (1.16.1-${BUILD_NUMBER}.local) trusty; urgency=medium
  * Package built by jenkins
 -- jenkins <${USER}@${NODE_NAME}>  $(date -R)
EOF

mkdir modules
cd $WORKSPACE/nginx-*/debian/modules

wget https://github.com/wistia/nginx-statsd/archive/master.tar.gz
tar xvf master.tar.gz
rm master.tar.gz

# Enable the nginx-statsd module
sed -i 's|CFLAGS="" ./configure \\|CFLAGS="" ./configure --add-module=debian/modules/nginx-statsd-master \\|' $WORKSPACE/nginx-*/debian/rules

cd $WORKSPACE/nginx-*/

dpkg-buildpackage --no-sign
