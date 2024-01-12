#!/bin/bash
cd "$(dirname "$0")"
du --bytes -s wp.*/volumes > disk-usage.log.tmp && mv disk-usage.log.tmp disk-usage.log
