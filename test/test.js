var net    = require('net');

var port        = 15000;
var lastMessage = null;

console.log('Native libmbus node-module test ...');


var server = net.createServer(function(socket) {
    console.log(new Date().toString() + ': mbus-TCP-Device: Connected!');

    socket.on('data', function (data) {
        if (!data) {
            console.log(new Date().toString() + ': mbus-TCP-Device: Received empty string!');
            return;
        }
        console.log(new Date().toString() + ': mbus-TCP-Device: Received from Master: ' + data.toString('hex'));

        var sendBuf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
        if (lastMessage !== data.toString('hex')) sendMessage(socket, sendBuf);

        lastMessage = data.toString('hex');
    });
    socket.on('error', function (err) {
        console.error(new Date().toString() + ': mbus-TCP-Device: Error: ' + err);
    });
    socket.on('close', function () {
        console.error(new Date().toString() + ': mbus-TCP-Device: Close');
    });
    socket.on('end', function () {
        console.error(new Date().toString() + ': mbus-TCP-Device: End');
    });
});

server.on('listening', function() {
    console.log('mbus-TCP-Device: Listening');
    test();
});

server.listen(port, '127.0.0.1');


function sendMessage(socket, message, callback) {
    console.log(new Date().toString() + ': mbus-TCP-Device: Send to Master: ' + message.toString('hex'));
    socket.write(message, function(err) {
        callback && callback(err);
    });
}

function test() {
    var mbus = require('bindings')('mbus')();
    //console.log('Open:',mbus.openSerial('/dev/pts/5',2400));
    console.log(new Date().toString() + ': mbus-Master Open:',mbus.openTCP('127.0.0.1', port));

    /*
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
    });*/
    console.log(new Date().toString() + ': mbus-Master Send "Get 1"');

    mbus.get(1,function(err,data){
        console.log(new Date().toString() + ': mbus-Master err: ' + err);
        console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(JSON.parse(data), null, 2));

        setTimeout(function() {
            console.log(new Date().toString() + ': mbus-Master Close: ' + mbus.close());
            server.close();
        }, 1000);
    });
    //socat tcp-l:54321,reuseaddr,fork file:/dev/ttyS0,nonblock,waitlock=/var/run/ttyS0.lock,b2400
}
