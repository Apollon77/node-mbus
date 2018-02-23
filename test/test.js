var net    = require('net');

var connected   = false;
var tcpClient   = new net.Socket();
var lastMessage;
var port        = 15000;



function sendMessage(message, callback) {
    tcpClient.write(message, function(err) {
        callback && callback(err);
    });
}

tcpClient.on('data', function (data) {
    if (!data) {
        console.log('Received empty string!');
        return;
    }
    console.log('Received ' + data);
    lastMessage = data;

    var sendBuf = new Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
    sendMessage(sendBuf);
});
tcpClient.on('error', function (err) {
    console.error('Error: ' + err);
});
tcpClient.connect(port, '127.0.0.1', function() {
    console.log('Connected!!');
});



var mbus = require('bindings')('mbus')();
//console.log('Open:',mbus.openSerial('/dev/pts/5',2400));
console.log('Open:',mbus.openTcp('127.0.0.1', port));

mbus.get(1,function(err,data){
	console.log('1:',err,data);
});
mbus.get(21,function(err,data){
	console.log('2:',err,data);
});
mbus.get(21,function(err,data){
	console.log('3:',err,data);
});
mbus.get(21,function(err,data){
	console.log('4:',err,data);
});
mbus.get(21,function(err,data){
	console.log('5:',err,data);
});
mbus.get(21,function(err,data){
	console.log('6:',err,data);
});
mbus.get(21,function(err,data){
	console.log('7:',err,data);
});
mbus.get(21,function(err,data){
	console.log('8:',err,data);
});
//console.log('Close:',mbus.close());
//socat tcp-l:54321,reuseaddr,fork file:/dev/ttyS0,nonblock,waitlock=/var/run/ttyS0.lock,b2400

tcpClient.destroy();
