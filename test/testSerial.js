/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/*jshint expr: true*/
var SegfaultHandler = require('segfault-handler');

SegfaultHandler.registerHandler(__dirname + "../crash.log"); // With no argument, SegfaultHandler will generate a generic log file name

var expect = require('chai').expect;

var net = require('net');
var MbusMaster = require('../index.js');

var port        = 15001;
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
        this.timeout(150000); // because of first install from npm

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
                    if (device === "fe" || device === "01" || device === "05") {
                        sendBuf = Buffer.from('5E', 'hex');
                        sendMessage(socket, sendBuf);
                    }
                }
                else if (hexData.substring(0,6) === '105b01') {
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Request for Class 2 Data ID 1');
                    sendBuf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0,6) === '105b02') {
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Request for Class 2 Data ID 2');
                    sendBuf = Buffer.from('689292680801723E020005434C1202130000008C1004521200008C1104521200008C2004334477018C21043344770102FDC9FF01ED0002FDDBFF01200002ACFF014F008240ACFF01EEFF02FDC9FF02E70002FDDBFF02230002ACFF0251008240ACFF02F1FF02FDC9FF03E40002FDDBFF03450002ACFF03A0008240ACFF03E0FF02FF68000002ACFF0040018240ACFF00BFFF01FF1304D916', 'hex');
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
                serialPort: '/tmp/virtualcom0',
                serialBaudRate: 2400
            };
            var mbusMaster = new MbusMaster(mbusOptions);
            console.log(new Date().toString() + ': mbus-Master Open:',mbusMaster.connect());
            expect(mbusMaster.mbusMaster.connected).to.be.true;
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
                        expect(data.SlaveInformation.Id).to.be.equal(5000244);
                        expect(data.DataRecords[0].Value).to.be.equal('1252');

                        mbusMaster.scanSecondary(function(err, data) {
                            console.log(new Date().toString() + ': mbus-Master err: ' + err);
                            console.log(new Date().toString() + ': mbus-Master data: ' + JSON.stringify(data, null, 2));
                            expect(err).to.be.null;
                            expect(data).to.be.an('array');
                            expect(data.length).to.be.equal(0);

                            setTimeout(function() {
                                console.log(new Date().toString() + ': mbus-Master Close: ' + mbusMaster.close());
                                server.close(function(err) {
                                    done();
                                });
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
