# node-mbus

[![NPM version](https://img.shields.io/npm/v/node-mbus.svg)](https://www.npmjs.com/package/node-mbus)
![Test and Release](https://github.com/Apollon77/node-mbus/workflows/Test%20and%20Release/badge.svg)
[![Downloads](https://img.shields.io/npm/dm/node-mbus.svg)](https://www.npmjs.com/package/node-mbus)

This library provides access to selected functions of the libmbus (https://github.com/rscada/libmbus) to communicate with mbus devices via serial or TCP connections.

The library is based on the great work of samkrew (https://github.com/samkrew) which developed the basis of this module for node 0.x.

## Usage example

```
var MbusMaster = require('node-mbus');

var mbusOptions = {
    host: '127.0.0.1',
    port: port,
    timeout: 2000,
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

#### A note about TCP communcation `timeout`

On TCP networks, this sets the response time-out in milliseconds.  The default is a quite conservative 4 seconds (4000ms).  For serial networks, it is a function of the baud rate: between 11 and 330 "bit times" to which one should factor in some round-trip-time delay for network traversal.

`libmbus` uses [the following equation](https://github.com/rscada/libmbus/blob/master/mbus/mbus-serial.c#L67-L79) to estimate this on serial networks (factoring in about 100ms round-trip-time between the host and the M-Bus driver):

```
(330 + 11) / BAUD + 0.15
```

 * 2400 baud network should respond within 300ms (~292ms), assuming 100ms host-driver round-trip time.
 * 300 baud network should respond within 1300ms (~1287ms), assuming 100ms host-driver round-trip time.

### connect(callback)
Call this method to connect to TCP/Serial. Needs to be done before you can communicate with the devices.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.

### close(callback, waitTillClosed)
Call this method to close the TCP/Serial connections.
The optional callback will be called with an *error* parameter that is *null* on success.
The method will return true/false when no callback is provided.
When you have provided a callback and you try to close the connection while communication is in progress the method will wait till communication has finished (checked every 500ms), then close the connection and then call the callback. When not using a callback then you get false as result in this case. When you set *waitTillClosed* while using a callback the callback will be called with an error if communication is still ongoing.

### getData(address, [options,] callback)
This method is requesting "Class 2 Data" from the device with the given *address*.

The *options* parameter is optional, and if given, is in the form of an object with one or more of the following properties set:

 * `pingFirst`: (Boolean; default `true`) Ping the target devices first before attempting communication.  This is primarily a work-around to some devices (such as the Sontex Supercal531) that must be "reset" first.  The default is to always perform these initial pings, however the feature can be disabled if the M-Bus slave devices are known to behave without it.

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

## Changelog
### 2.2.5 (2025-07-25)
* (Apollon77) Allow build with Node.js 24

### 2.2.4 (2024-05-09)
* (Apollon77) Allow build with Node.js 22

### 2.2.2 (2024-04-05)
* (hvacrcontrol) Fixed baudrate 1200 for windows

### 2.2.1 (2024-03-28)
* (petrkr) Added IPv6 support to TCP connection
* Updated dependencies

### 2.1.0 (2023-08-11)
* (JKRhb) added support for Node.js 20.x
* (hasanheroglu) added context aware support
* (sjlongland) makes device ping configurable and add TCP timeout documentation
* Updated deps

### 2.0.0 (2022-06-29)
* IMPORTANT: Minimum node.js version is not 12.x and all LTS supported up to 18.x
* Add promisified methods with Async at the end of the name (e.g. `connectAsync`)
* Internal rewrite to ES6 class

### 1.2.2 (2021-03-06)
* try to send reset to the exact device when reading data

### 1.2.1 (2020-08-16)
* fix potential crash case

### 1.2.0 (2020-08-02)
* update to libmbus 0.9.0 from 16.7.2020

### 1.1.0 (2020-04-12)
* make compatible to nodejs 13
* update deps

### 1.0.1 (2019-10-16)
* update deps

### 1.0.0 (2019-05-04)
* added compatibility to nodejs 12, but also remove support for nodejs 4 (may work, but can break anytime)
* bring in sync with libmbus 0.9.0-1

### 0.6.0/1 (2018-12-09)
* added multi telegram support (thanks to @lvogt)
* changed fcb flagging

### v0.5.2 (2018.04.18)
* remove unneeded debug output to stdout

### v0.5.1 (2018.04.16)
* fix secondary scan

### v0.5.0 (2018.03.26)
* add method to set a new Primary ID for a device

### v0.3.0 (2018.03.15)
* official release

### v0.2.x (2018.03.11)
* change to XML mbus methods "under the hood" and parse result to JSON

### v0.1.x (2018.03.06)
* initial release
