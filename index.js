/* jshint -W097 */
// jshint strict:true
/*jslint node: true */
/*jslint esversion: 6 */
'use strict';

var mbusBinding = require('bindings')('mbus');
var xmlParser = require('xml2js');

function MbusMaster(options) {
    this.options = options;
    this.mbusMaster = new mbusBinding.MbusMaster();
}

MbusMaster.prototype.connect = function connect(callback) {
    if (this.mbusMaster.connected && this.mbusMaster.communicationInProgress) {
        if (callback) {
            callback(new Error('Communication already in progress'));
        }
        return false;
    }
    if (this.mbusMaster.connected) {
        if (callback) {
            callback(null);
        }
        return true;
    }
    if (this.options.host && this.options.port) {
        if (!this.options.timeout) this.options.timeout = 0;
        if (this.mbusMaster.openTCP(this.options.host, this.options.port, this.options.timeout/1000)) {
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

MbusMaster.prototype.close = function close(callback, wait) {
    if (wait === undefined) {
        if (callback) wait = true;
            else wait = false;
    }
    if (wait && !callback) wait = false;
    if (this.mbusMaster.connected && this.mbusMaster.communicationInProgress) {
        if (!wait) {
            if (callback) {
                callback(new Error('Communication still in progress.'));
            }
            return false;
        }
        var self = this;
        setTimeout(function() {
            self.close(callback, wait);
        }, 500);
        return undefined;
    }
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
                //data = JSON.parse(data).MBusData;
                var parserOpt =  {
                    explicitArray: false,
                    mergeAttrs: true,
                    valueProcessors: [xmlParser.processors.parseNumbers],
                    attrValueProcessors: [xmlParser.processors.parseNumbers]
                };
                xmlParser.parseString(data, parserOpt, function (err, result) {
                    if (!err) {
                        result = result.MBusData;
                    }
                    if (result && result.DataRecord && !Array.isArray(result.DataRecord)) {
                        result.DataRecord = [result.DataRecord];
                    }
                    if (callback) callback(err, result);
                });
                return;
            }
            else {
                err = new Error(err);
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
                    try {
                        data = JSON.parse(data);
                    }
                    catch (e) {
                        err = new Error(e + ': ' + data);
                        data = null;
                    }
                }
            }
            else {
                err = new Error(err);
            }
            if (callback) callback(err, data);
        });
    });
};

MbusMaster.prototype.setPrimaryId = function setPrimaryId(oldAddress, newAddress, callback) {
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
        self.mbusMaster.setPrimaryId(oldAddress, newAddress, function(err) {
            if (err) {
                err = new Error(err);
            }
            else {
                err = null;
            }
            if (callback) callback(err);
        });
    });
};

module.exports = MbusMaster;
