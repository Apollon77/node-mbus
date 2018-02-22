#!/bin/sh

git clone https://github.com/Apollon77/libmbus.git libmbus
cd ./libmbus/
./build.sh && make
cd ..
