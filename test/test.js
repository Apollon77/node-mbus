var net = require('net');
var mbus = require('../index.js');

var port        = 15000;
var lastMessage = null;

console.log('Native libmbus node-module test ...');


var server = net.createServer(function(socket) {
    console.log(new Date().toString() + ': mbus-TCP-Device: Connected!');

    socket.setNoDelay();

    socket.on('data', function (data) {
        var sendBuf;

        if (!data) {
            console.log(new Date().toString() + ': mbus-TCP-Device: Received empty string!');
            return;
        }
        var hexData = data.toString('hex');
        console.log(new Date().toString() + ': mbus-TCP-Device: Received from Master: ' + hexData);

        if (hexData.substring(0,4) === '1040') {
            console.log(new Date().toString() + ':     mbus-TCP-Device: Initialization Request');
            sendBuf = Buffer.from('5E', 'hex');
            sendMessage(socket, sendBuf);
        }
        else if (hexData.substring(0,4) === '105b') {
            console.log(new Date().toString() + ':     mbus-TCP-Device: Request for Class 2 Data');
            sendBuf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
            sendMessage(socket, sendBuf);
        }
        lastMessage = hexData;
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
    console.log(new Date().toString() + ':     mbus-TCP-Device: Send to Master: ' + message.toString('hex'));
    socket.write(message, function(err) {
        console.log(new Date().toString() + ':         mbus-TCP-Device: Send done');
        callback && callback(err);
    });
}

function test() {
    var mbusOptions = {
        host: '127.0.0.1',
        port: port
    }
    var mbusMaster = new mbus(mbusOptions);
    //console.log('Open:',mbus.openSerial('/dev/pts/5',2400));
    console.log(new Date().toString() + ': mbus-Master Open:',mbusMaster.connect());

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
    setTimeout(function() {
        console.log(new Date().toString() + ': mbus-Master Send "Get 1"');

        mbusMaster.getData(1, function(err, data){
            console.log(new Date().toString() + ': mbus-Master err: ' + err);
            console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));

            mbusMaster.getData(2, function(err, data){
                console.log(new Date().toString() + ': mbus-Master err: ' + err);
                console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));

                setTimeout(function() {
                    console.log(new Date().toString() + ': mbus-Master Close: ' + mbusMaster.close());
                    server.close();
                }, 1000);
            });
        });
    }, 2000);
    //socat tcp-l:54321,reuseaddr,fork file:/dev/ttyS0,nonblock,waitlock=/var/run/ttyS0.lock,b2400
}
