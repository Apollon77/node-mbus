# node-mbus

[![Greenkeeper badge](https://badges.greenkeeper.io/Apollon77/dnode-mbus.svg)](https://greenkeeper.io/)
[![NPM version](http://img.shields.io/npm/v/node-mbus.svg)](https://www.npmjs.com/package/node-mbus)
[![Downloads](https://img.shields.io/npm/dm/node-mbus.svg)](https://www.npmjs.com/package/node-mbus)
[![Dependency Status](https://gemnasium.com/badges/github.com/Apollon77/node-mbus.svg)](https://gemnasium.com/github.com/Apollon77/node-mbus)
[![Code Climate](https://codeclimate.com/github/Apollon77/node-mbus/badges/gpa.svg)](https://codeclimate.com/github/Apollon77/node-mbus)

**Tests:**
[![Test Coverage](https://codeclimate.com/github/Apollon77/node-mbus/badges/coverage.svg)](https://codeclimate.com/github/Apollon77/node-mbus/coverage)
Linux/Mac:
[![Travis-CI](http://img.shields.io/travis/Apollon77/node-mbus/master.svg)](https://travis-ci.org/Apollon77/node-mbus)
Windows: [![AppVeyor](https://ci.appveyor.com/api/projects/status/github/Apollon77/node-mbus?branch=master&svg=true)](https://ci.appveyor.com/project/Apollon77/node-mbus/)

[![NPM](https://nodei.co/npm/node-mbus.png?downloads=true)](https://nodei.co/npm/node-mbus/)

This library provides access to selected functions of the libmbus (https://github.com/rscada/libmbus) to communicate with mbus devices via serial or TCP connections.

The library is based on the great work of samkrew (https://github.com/samkrew) which developed the basis of this module for node 0.x.

## Usage example

```
var MbusMaster = require('node-mbus');

var mbusOptions = {
    host: '127.0.0.1',
    port: port,
    autoConenct: true
};
var mbusMaster = new MbusMaster(mbusOptions);

mbusMaster.connect();

// request for data from devide with ID 1
mbusMaster.getData(1, function(err, data) {
    console.log('err: ' + err);
    console.log('data: ' + JSON.stringify(data, null, 2));

    mbusMaster.close();
});
```

## Usage informations

...

## Method description

### MbusMaster(options)
Constructor to initialize the MBusMaster instance to interact with the devices.
In the options object you set the communication and other parameter for the library:
* *host*/*port*: For TCP communication you set the *host* and the *port* to connect to. Both parameters are mandatory
* *serialPort*/*serialBaudRate*: For Serial communication you set the *serialPort* (e.g. /dev/ttyUSB0) and optionally the *serialBaudRate* to connect. Default Baudrate is 2400baut if option is missing
* *autoConnect*: set to "true" if connection should be established automatically when needed - else you need to call "connect()" before you can communicate with the devices.

### connect(callback)
Call this method to connect to TCP/Serial. Needs to be done before you can communicate with the devices.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.

### close(callback)
Call this method to close the TCP/Serial connections.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.

### getData(address, callback)
This method is requesting "Class 2 Data" from the device with the given *address*.
The callback is called with an *error* and *data* parameter. When data are received successfully the *data* parameter contains the data object.

Data example:
```
{
  "SlaveInformation": {
    "Id": 11490378,
    "Manufacturer": "ACW",
    "Version": 14,
    "ProductName": "Itron BM +m",
    "Medium": "Cold water",
    "AccessNumber": 41,
    "Status": "00",
    "Signature": "0000"
  },
  "DataRecords": [
    {
      "id": 0,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Fabrication number",
      "Value": "11490378",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 1,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Volume (m m^3)",
      "Value": "54321",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 2,
      "Function": "Instantaneous value",
      "StorageNumber": 1,
      "Unit": "Time Point (date)",
      "Value": "2000-00-00",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 3,
      "Function": "Instantaneous value",
      "StorageNumber": 1,
      "Unit": "Volume (m m^3)",
      "Value": "0",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 4,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Time Point (time & date)",
      "Value": "2012-01-24T13:29:00",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 5,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Operating time (days)",
      "Value": "0",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 6,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Firmware version",
      "Value": "2",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 7,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Software version",
      "Value": "6",
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 8,
      "Function": "Manufacturer specific",
      "Value": "00 00 8F 13",
      "Timestamp": "2018-02-24T22:17:01"
    }
  ]
}
```

### scanSecondary(callback)
This method scans for secondary IDs (?!) and returns an array with the found IDs.
The callback is called with an *error* and *scanResult* parameter. The scan result is returned in the *scanResult* parameter as Array with the found IDs. If no IDs are found the Array is empty.

## Todo
* Also build the libmbus binaries and tools? (if needed)
* real life tests

## Changelog

### v0.1.2 (2018.03.05)
* initial release
