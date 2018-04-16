# node-mbus

[![Greenkeeper badge](https://badges.greenkeeper.io/Apollon77/node-mbus.svg)](https://greenkeeper.io/)
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
    timeout: 2000
    autoConnect: true
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

## Method description

### MbusMaster(options)
Constructor to initialize the MBusMaster instance to interact with the devices.
In the options object you set the communication and other parameter for the library:
* *host*/*port*/*timeout*: For TCP communication you set the *host* and the *port* to connect to. Both parameters are mandatory. By setting the optional *timeout* in ms you can overwrite the default timeout (4000ms)
* *serialPort*/*serialBaudRate*: For Serial communication you set the *serialPort* (e.g. /dev/ttyUSB0) and optionally the *serialBaudRate* to connect. Default Baudrate is 2400baud if option is missing
* *autoConnect*: set to "true" if connection should be established automatically when needed - else you need to call "connect()" before you can communicate with the devices.

### connect(callback)
Call this method to connect to TCP/Serial. Needs to be done before you can communicate with the devices.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.

### close(callback, waitTillClosed)
Call this method to close the TCP/Serial connections.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.
When you have provided a callback and you try to close the connection while communication is in progress the method will wait till communication has finished (checked every 500ms), then close the connection and then call the callback. When not using a callback then you get false as result in this case. When you set *waitTillClosed* while using a callback the callback will be called with an error if communication is still ongoing.

### getData(address, callback)
This method is requesting "Class 2 Data" from the device with the given *address*.
The callback is called with an *error* and *data* parameter. When data are received successfully the *data* parameter contains the data object.
When you try to read data while communication is in progress your callback is called with an error.

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
    "Status": 0,
    "Signature": 0
  },
  "DataRecord": [
    {
      "id": 0,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Fabrication number",
      "Value": 11490378,
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 1,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Volume (m m^3)",
      "Value": 54321,
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
      "Value": 0,
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
      "Value": 0,
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 6,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Firmware version",
      "Value": 2,
      "Timestamp": "2018-02-24T22:17:01"
    },
    {
      "id": 7,
      "Function": "Instantaneous value",
      "StorageNumber": 0,
      "Unit": "Software version",
      "Value": 6,
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
When you try to read data while communication is in progress your callback is called with an error.

**Note:** The secondary scan can take a while, so > 5-100 seconds is normal depending on the used timeouts! When there are ID collisions and scan needs to get a level deeper then it can take even longer.
So just know that it can take very long :-)

### setPrimaryId(oldAddress, newAddress, callback)
This method allows you to set a new primary ID for a device. You can use any primary (Number, 0..250) or secondary (string, 16 characters long) address as *oldAddress*. The *newAddress* must be a primary address as Number 0..250. The callback will be called with an empty *error* parameter on success or an Error object on failure.
When you try to read data while communication is in progress your callback is called with an error.

## MBust-Master Devices reported as working
* Aliexpress USB MBus Master (https://m.de.aliexpress.com/item/32755430755.html?trace=wwwdetail2mobilesitedetail&productId=32755430755&productSubject=MBUS-to-USB-master-module-MBUS-device-debugging-dedicated-no-power-supply)
* ADFWeb (https://www.adfweb.com/Home/products/mbus_gateway.asp?frompg=nav8_5)

## Todo
* Also build the libmbus binaries and tools? (if needed)
* real life tests

## Changelog

### v0.5.1 (2018.04.16)
* fix secondary scan

### v0.5.0 (2018.03.26)
* add method to set a new Primary ID for a device

### v0.4.x (2018.03.25)
* library now tries to make sure that only one request/scan runs and also connect/close should be secured
* add option to overwrite default tcp timeout
* allow close when using callback to wait till connection can be closed (will check any 500ms)

### v0.3.0 (2018.03.15)
* official release

### v0.2.x (2018.03.11)
* change to XML mbus methods "under the hood" and parse result to JSON

### v0.1.x (2018.03.06)
* initial release
