/* jshint -W097 */
// jshint strict:true
/*jslint node: true */
/*jslint esversion: 6 */
'use strict';

var mbusBinding = require('bindings')('mbus');

function MbusMaster(options) {
    this.options = options;
    this.mbusMaster = new mbusBinding.MbusMaster();
}

MbusMaster.prototype.connect = function connect(callback) {
    if (this.mbusMaster.connected) {
        if (callback) {
            callback(null);
        }
        return true;
    }
    if (this.options.host && this.options.port) {
        if (this.mbusMaster.openTCP(this.options.host, this.options.port)) {
            if (callback) {
                callback(null);
            }
            return true;
        }
        else {
            if (callback) {
                callback(new Error('No connection possible to MBus Host ' + this.options.host + ':' + this.options.port));
            }
            return false;
        }
    }
    else if (this.options.serialPort) {
        var baudRate = this.options.serialBaudRate || 0;
        if (this.mbusMaster.openSerial(this.options.serialPort, baudRate)) {
            if (callback) {
                callback(null);
            }
            return true;
        }
        else {
            if (callback) {
                callback(new Error('No connection possible to MBus Serial port ' + this.options.serialPort));
            }
            return false;
        }
    }
    if (callback) {
        callback(new Error('No valid connection parameter provided'));
    }
    return false;
};

MbusMaster.prototype.close = function close(callback) {
    if (!this.mbusMaster.connected) {
        if (callback) {
            callback(null);
        }
        return true;
    }

    if (this.mbusMaster.close()) {
        if (callback) {
            callback(null);
        }
        return true;
    }
    else {
        if (callback) {
            callback(new Error('Close unsuccessfull'));
        }
        return false;
    }
};

MbusMaster.prototype.getData = function getData(address, callback) {
    if (!this.mbusMaster.connected && !this.options.autoConnect) {
        if (callback) callback(new Error('Not connected and autoConnect is false'));
        return;
    }

    var self = this;
    this.connect(function(err) {
        if (err) {
            if (callback) callback(err);
            return;
        }
        self.mbusMaster.get(address, function(err, data) {
            if (!err && data) {
                try {
                    data = JSON.parse(data).MBusData;
                }
                catch (e) {
                    err = e;
                    data = null;
                }
            }
            if (callback) callback(err, data);
        });
    });
};

MbusMaster.prototype.scanSecondary = function scanSecondary(callback) {
    if (!this.mbusMaster.connected && !this.options.autoConnect) {
        if (callback) callback(new Error('Not connected and autoConnect is false'));
        return;
    }

    var self = this;
    this.connect(function(err) {
        if (err) {
            if (callback) callback(err);
            return;
        }
        self.mbusMaster.scan(function(err, data) {
            if (!err && data !== null && data !== undefined && typeof data === 'string' ) {
                if (data === '') {
                    data = [];
                }
                else {
                    data = data.split(',');
                    for (var i = 0; i < data.length; i++) {
                        if (data[i][0] === '[') data[i] = data[i].substring(1);
                        if (data[i][0] === '"') data[i] = data[i].substring(1);
                        if (data[i][data[i].length-1] === ']') data[i] = data[i].substring(0, data[i].length-1);
                        if (data[i][data[i].length-1] === '"') data[i] = data[i].substring(0, data[i].length-1);
                    }
                }
            }
            if (callback) callback(err, data);
        });
    });
};

module.exports = MbusMaster;
