var WMBUS = require('wm-bus').WMBUS;

/*
var config = [
    { manufacturerId: '60092596', aesKey: '1212121212121212'},
    { manufacturerId: '60092599', aesKey: '3434343434343434'}
];
*/

WMBUS.prototype.updateStates = function(){
    if (this.errorcode !== this.cc.ERR_NO_ERROR) {
        console.log("Error Code: " + this.errorcode + " " + this.errormsg);
        return;
    }
    console.log('name: ' + this.manufacturer + '-' + this.afield_id);
    console.log('encryptionMode: ' + this.encryptionMode);
    for (var i = 0; i < this.datablocks.length; i++) {
        var data = this.datablocks[i];
        console.log('  type: ' + data.type);
        for (var j in data) {
            switch (j) {
                //case 'type':
                case 'unit':
                case 'value':
                    //case 'extension':
                    //case 'functionFieldText':
                    if (data[i]) {
                        console.log('    ' + j + ': ' + data[i]);
                    }
            }
        }
    }
};

var wmbus = new WMBUS(); //(log: log function, formatDate: formatDate Function);
/*
for (var i=0; i < config.length; i++) {
    var device = config[i];
    wmbus.addAESKey(device.manufacturerId, device.aesKey);
}*/

console.log();
console.log();
console.log();
console.log('WM-Bus Library test ...');

var buf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816','hex');
wmbus.parse(buf.toString('binary'));


console.log();
console.log();
console.log();
console.log('WM-Bus Library test mbus...');
wmbus.parseMBus(buf.toString('binary'));
