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


var spawn  = require('child_process').spawn;

function sendMessage(socket, message, callback) {
    console.log(new Date().toString() + ':     mbus-Serial-Device: Send to Master: ' + message.toString('hex'));
    socket.write(message, function(err) {
        console.log(new Date().toString() + ':         mbus-Serial-Device: Send done');
        callback && callback(err);
    });
}

describe('Native libmbus node-module Serial test ...', function() {

    it('Test Reading Serial', function (done) {
        this.timeout(300000); // because of first install from npm

        if (process.env.APPVEYOR && process.env.APPVEYOR==='True') {
            console.log('Serial testing not possible on Appveyor ... skipping');
            done();
            return;
        }

        var server = net.createServer(function(socket) {
            console.log(new Date().toString() + ': mbus-Serial-Device: Connected ' + port + '!');

            socket.setNoDelay();

            var counterFD = 0;
            socket.on('data', function (data) {
                var sendBuf;

                if (!data) {
                    console.log(new Date().toString() + ': mbus-Serial-Device: Received empty string!');
                    return;
                }
                var hexData = data.toString('hex');
                console.log(new Date().toString() + ': mbus-Serial-Device: Received from Master: ' + hexData);

                if (hexData.substring(0,4) === '1040') {
                    var device = hexData.substring(4,6);
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Initialization Request ' + device);
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
                else if (hexData.substring(0, 6) === '105b01') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID 1');
                    sendBuf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0, 6) === '105b02') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID 2');
                    sendBuf = Buffer.from('689292680801723E020005434C1202130000008C1004521200008C1104521200008C2004334477018C21043344770102FDC9FF01ED0002FDDBFF01200002ACFF014F008240ACFF01EEFF02FDC9FF02E70002FDDBFF02230002ACFF0251008240ACFF02F1FF02FDC9FF03E40002FDDBFF03450002ACFF03A0008240ACFF03E0FF02FF68000002ACFF0040018240ACFF00BFFF01FF1304D916', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff1ff') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Secondary Scan found');
                    sendBuf = Buffer.from('E5', 'hex');
                    sendMessage(socket, sendBuf);
                }
                else if (hexData.substring(0, 6) === '105bfd') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID FD');
                    sendBuf = Buffer.from('6815156808017220438317b40901072b0000000c13180000009f16', 'hex');
                    sendMessage(socket, sendBuf);
                }
                lastMessage = hexData;
            });
            socket.on('error', function (err) {
                console.error(new Date().toString() + ': mbus-Serial-Device: Error: ' + err);
            });
            socket.on('close', function () {
                console.error(new Date().toString() + ': mbus-Serial-Device: Close');
            });
            socket.on('end', function () {
                console.error(new Date().toString() + ': mbus-Serial-Device: End');
            });
        });

        server.on('listening', function() {
            console.log('mbus-Serial-Device: Listening');

            var socat;
            if (!(process.env.APPVEYOR && process.env.APPVEYOR==='True')) {
                socat = spawn('socat', ['-Dxs', 'pty,link=/tmp/virtualcom0,ispeed=9600,ospeed=9600,raw', 'tcp:127.0.0.1:15001']);
            }
            else { // com2tcp.exe --ignore-dsr --baud 57600 \.\COM6 192.168.11.80 11001
                socat = spawn('C:\\cygwin\\bin\\socat.exe', ['-Dxs', 'pty,link=\\\\.\\SER1,ispeed=9600,ospeed=9600,raw', 'tcp:127.0.0.1:15001']);
            }
            console.log('mbus-Serial-Device: Socat spawned');
            socat.stdout.on('data', function(data) {
              console.log('socat stdout: ' + data);
            });

            socat.stderr.on('data', function(data) {
              console.log('socat stderr: ' + data);
            });

            socat.on('close', function(code) {
              console.log('socat child process exited with code ' + code);
            });

            setTimeout(function() {
                if (!(process.env.APPVEYOR && process.env.APPVEYOR==='True')) {
                    var mbusOptions = {
                        serialPort: '/tmp/virtualcom0',
                        serialBaudRate: 9600
                    };
                }
                else {
                    var mbusOptions = {
                        serialPort: 'SER1',
                        serialBaudRate: 9600
                    };
                }
                var mbusMaster = new MbusMaster(mbusOptions);
                var connectResult = mbusMaster.connect();
                console.log(new Date().toString() + ': mbus-Serial-Master Open:' + connectResult);
                if (!connectResult) {
                    socat.kill('SIGKILL');
                    server.close();
                }
                expect(mbusMaster.mbusMaster.connected).to.be.true;
                setTimeout(function() {
                    console.log(new Date().toString() + ': mbus-Serial-Master Send "Get 1"');

                    mbusMaster.getData(1, function(err, data) {
                        console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                        console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                        expect(err).to.be.null;
                        expect(data.SlaveInformation.Id).to.be.equal(11490378);
                        expect(data.DataRecord[0].Value).to.be.equal(11490378);

                        mbusMaster.getData(2, function(err, data) {
                            console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                            console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                            expect(err).to.be.null;
                            expect(data.SlaveInformation.Id).to.be.equal(5000244);
                            expect(data.DataRecord[0].Value).to.be.equal(1252);

                            mbusMaster.scanSecondary(function(err, data) {
                                console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                                console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                                expect(err).to.be.null;
                                expect(data).to.be.an('array');
                                expect(data.length).to.be.equal(1);
                                expect(data[0]).to.be.equal('17834320B4090107');

                                setTimeout(function() {
                                    console.log(new Date().toString() + ': mbus-Serial-Master Close: ' + mbusMaster.close());
                                    socat.kill('SIGKILL');
                                    console.log('mbus-Serial-Device: Socat killed');
                                    setTimeout(function() {
                                        server.close(function(err) {
                                            console.log('mbus-Serial-Device: Server closed');
                                            setTimeout(done, 2000);
                                        });
                                    }, 1000);
                                }, 1000);
                            });
                        });
                    });
                }, 2000);
            }, 2000);
        });

        server.listen(port, '127.0.0.1');
    });
});
