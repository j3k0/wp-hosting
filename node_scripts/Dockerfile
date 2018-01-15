FROM node
RUN \
    mkdir -p /scripts && \
    cd /scripts && \
    npm install keycdn
COPY help.js keycdn-get-zones.js keycdn-create-zone.js /scripts/
WORKDIR /scripts
CMD node help.js
