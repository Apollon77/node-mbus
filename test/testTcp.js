/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/*jshint expr: true*/
var SegfaultHandler = require('segfault-handler');

SegfaultHandler.registerHandler(__dirname + "../crash.log"); // With no argument, SegfaultHandler will generate a generic log file name

var expect = require('chai').expect;

var net = require('net');
var MbusMaster = require('../index.js');

var port        = 15000;
var lastMessage = null;

function sendMessage(socket, message, callback) {
    console.log(new Date().toString() + ':     mbus-TCP-Device: Send to Master: ' + message.toString('hex'));
    socket.write(message, function(err) {
        console.log(new Date().toString() + ':         mbus-TCP-Device: Send done');
        callback && callback(err);
    });
}

describe('Native libmbus node-module TCP test ...', function() {

    it('Test Reading TCP', function (done) {
        this.timeout(300000); // because of first install from npm

        var testSocket;
        var server = net.createServer(function(socket) {
            console.log(new Date().toString() + ': mbus-TCP-Device: Connected ' + port + '!');

            socket.setNoDelay();
            testSocket = socket;

            socket.on('data', function (data) {
                var sendBuf;
                var counterFD;

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
                        sendBuf = Buffer.from('E5', 'hex');
                        sendMessage(socket, sendBuf);
                    }
                    else if (device === "fd") {
                        if (counterFD%2 === 0) {
                            sendBuf = Buffer.from('E5', 'hex');
                            sendMessage(socket, sendBuf);
                        }
                        counterFD++;
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
                else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff1ff') {
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Secondary Scan found');
                    sendBuf = Buffer.from('E5', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0, 6) === '105bfd') {
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Request for Class 2 Data ID FD');
                    sendBuf = Buffer.from('6815156808017220438317b40901072b0000000c13180000009f16', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0, 20) === '68060668530151017a03') {
                    console.log(new Date().toString() + ':     mbus-TCP-Device: Request for ID Change 1 -> 3');
                    sendBuf = Buffer.from('E5', 'hex');
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
                port: port,
                timeout: 100
            };
            var mbusMaster = new MbusMaster(mbusOptions);
            var connectResult = mbusMaster.connect();
            console.log(new Date().toString() + ': mbus-TCP-Master Open:' + connectResult);
            if (!connectResult) server.close();
            var emergencyTimeout = setTimeout(function() {
                testSocket.destroy();
                server.close();
                done();
            }, 20000); // Killswitch!
            expect(mbusMaster.mbusMaster.connected).to.be.true;
            expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;
            setTimeout(function() {
                console.log(new Date().toString() + ': mbus-TCP-Master Send "Get 1"');

                mbusMaster.getData(1, function(err, data) {
                    console.log(new Date().toString() + ': mbus-TCP-Master err: ' + err);
                    console.log(new Date().toString() + ': mbus-TCP-Master data: ' + JSON.stringify(data, null, 2));
                    expect(err).to.be.null;
                    expect(data.SlaveInformation.Id).to.be.equal(11490378);
                    expect(data.DataRecord[0].Value).to.be.equal(11490378);
                    expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                    mbusMaster.getData(2, function(err, data) {
                        console.log(new Date().toString() + ': mbus-TCP-Master err: ' + err);
                        console.log(new Date().toString() + ': mbus-TCP-Master data: ' + JSON.stringify(data, null, 2));
                        expect(err).to.be.null;
                        expect(data.SlaveInformation.Id).to.be.equal(5000244);
                        expect(data.DataRecord[0].Value).to.be.equal(1252);
                        expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                        mbusMaster.setPrimaryId(1, 3, function(err) {
                            console.log(new Date().toString() + ': mbus-TCP-Master err: ' + err);
                            expect(err).to.be.null;
                            expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                            mbusMaster.scanSecondary(function(err, data) {
                                console.log(new Date().toString() + ': mbus-TCP-Master err: ' + err);
                                console.log(new Date().toString() + ': mbus-TCP-Master data: ' + JSON.stringify(data, null, 2));
                                expect(err).to.be.null;
                                expect(data).to.be.an('array');
                                expect(data.length).to.be.equal(1);
                                expect(data[0]).to.be.equal('17834320B4090107');
                                expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                                setTimeout(function() {
                                    console.log(new Date().toString() + ': mbus-TCP-Master Close: ' + mbusMaster.close());
                                    server.close(function() {
                                        testSocket.destroy();
                                        done();
                                    });
                                }, 1000);
                            });
                            expect(mbusMaster.mbusMaster.communicationInProgress).to.be.true;
                            expect(mbusMaster.close()).to.be.false;
                            mbusMaster.getData(3, function(err, data) {
                                expect(err.message).to.be.equal('Communication already in progress');
                            });
                        });
                    });
                });
                expect(mbusMaster.mbusMaster.communicationInProgress).to.be.true;
            }, 2000);
        });

        server.listen(port, '127.0.0.1');
    });
});
