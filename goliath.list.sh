#!/bin/bash
(for j in `for i in shop.pressmantoy.com modelco.fr pressmantoy.com wp.goliath.*; do cat $i/nginx-site | grep server_name | grep -v phpmyadmin | sed 's/server_name//g' | sed 's/;//g'; done`; do echo http://$j; done) | grep -v .ggs.ovh
