#!/bin/bash

mkdir -p cert
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout cert/cert.key -out cert/cert.crt << EOF
> FR
> Haute-Garonne
> Toulouse
> Fovea
>
> zalka.fovea.cc
> hoelt@fovea.cc
> EOF
