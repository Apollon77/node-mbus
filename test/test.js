/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/*jshint expr: true*/
var expect = require('chai').expect;

var net = require('net');
var mbus = require('../index.js');

var port        = 15000;
var lastMessage = null;

console.log('Native libmbus node-module test ...');

function sendMessage(socket, message, callback) {
    console.log(new Date().toString() + ':     mbus-TCP-Device: Send to Master: ' + message.toString('hex'));
    socket.write(message, function(err) {
        console.log(new Date().toString() + ':         mbus-TCP-Device: Send done');
        callback && callback(err);
    });
}

describe('Native libmbus node-module test ...', function() {

    it('Test Reading', function (done) {
        this.timeout(120000); // because of first install from npm

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
                    var device = hexData.substring(4,6);
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Initialization Request ' + device);
                    if (device === "fd" || device === "01" || device === "05")
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

            var mbusOptions = {
                host: '127.0.0.1',
                port: port
            };
            var mbusMaster = new mbus(mbusOptions);
            console.log(new Date().toString() + ': mbus-Master Open:',mbusMaster.connect());
            setTimeout(function() {
                console.log(new Date().toString() + ': mbus-Master Send "Get 1"');

                mbusMaster.getData(1, function(err, data) {
                    console.log(new Date().toString() + ': mbus-Master err: ' + err);
                    console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));
                    expect(err).to.be.null;
                    expect(data.SlaveInformation.Id).to.be.equal(11490378);
                    expect(data.DataRecords[0].Value).to.be.equal('11490378');

                    mbusMaster.getData(2, function(err, data) {
                        console.log(new Date().toString() + ': mbus-Master err: ' + err);
                        console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));
                        expect(err).to.be.null;
                        expect(data.SlaveInformation.Id).to.be.equal(11490378);
                        expect(data.DataRecords[0].Value).to.be.equal('11490378');

                        mbusMaster.scanSecondary(function(err, data) {
                            console.log(new Date().toString() + ': mbus-Master err: ' + err);
                            console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));
                            expect(err).to.be.null;
                            expect(data).to.be.an('array');
                            expect(data.length).to.be.equal(0);

                            setTimeout(function() {
                                console.log(new Date().toString() + ': mbus-Master Close: ' + mbusMaster.close());
                                server.close();
                                done();
                            }, 1000);
                        });
                    });
                });
            }, 2000);
            //socat tcp-l:54321,reuseaddr,fork file:/dev/ttyS0,nonblock,waitlock=/var/run/ttyS0.lock,b2400

        });

        server.listen(port, '127.0.0.1');
    });
});
