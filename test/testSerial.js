/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/*jshint expr: true*/
const expect = require('chai').expect;

const net = require('net');
const os = require('os');
const MbusMaster = require('../index.js');

const port        = 15001;
let lastMessage = null;


const spawn  = require('child_process').spawn;

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

        let testSocket;
        let secondaryCase = "";
        const server = net.createServer(function (socket) {
            console.log(new Date().toString() + ': mbus-Serial-Device: Connected ' + port + '!');

            socket.setNoDelay();
            testSocket = socket;

            var counterFD = 0;
            socket.on('data', function (data) {
                let sendBuf;

                if (!data) {
                    console.log(new Date().toString() + ': mbus-Serial-Device: Received empty string!');
                    return;
                }
                const hexData = data.toString('hex');
                console.log(new Date().toString() + ': mbus-Serial-Device: Received from Master: ' + hexData);

                if (hexData.substring(0, 4) === '1040') {
                    const device = hexData.substring(4, 6);
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Initialization Request ' + device);
                    if (device === "fe" || device === "01" || device === "05") {
                        sendBuf = Buffer.from('E5', 'hex');
                        sendMessage(socket, sendBuf);
                    } else if (device === "fd") {
                        if (counterFD % 2 === 0) {
                            sendBuf = Buffer.from('E5', 'hex');
                            sendMessage(socket, sendBuf);
                        }
                        counterFD++;
                    }
                } else if (hexData.substring(0, 6) === '105b01' || hexData.substring(0, 6) === '107b01') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID 1');
                    sendBuf = Buffer.from('683C3C680808727803491177040E16290000000C7878034911041331D40000426C0000441300000000046D1D0D98110227000009FD0E0209FD0F060F00008F13E816', 'hex');
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 6) === '105b02' || hexData.substring(0, 6) === '107b02') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID 2');
                    sendBuf = Buffer.from('689292680801723E020005434C1202130000008C1004521200008C1104521200008C2004334477018C21043344770102FDC9FF01ED0002FDDBFF01200002ACFF014F008240ACFF01EEFF02FDC9FF02E70002FDDBFF02230002ACFF0251008240ACFF02F1FF02FDC9FF03E40002FDDBFF03450002ACFF03A0008240ACFF03E0FF02FF68000002ACFF0040018240ACFF00BFFF01FF1304D916', 'hex');
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff1ff') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Secondary Scan found (1)');
                    sendBuf = Buffer.from('E5', 'hex');
                    secondaryCase = "1f";
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff6ff') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Secondary Scan found (6-Collision)');
                    sendBuf = Buffer.from('004400', 'hex');
                    secondaryCase = "6f";
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff62f') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Secondary Scan found (62)');
                    sendBuf = Buffer.from('E5', 'hex');
                    secondaryCase = "62";
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 23) === '680b0b6873fd52ffffff68f') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Secondary Scan found (68)');
                    sendBuf = Buffer.from('E5', 'hex');
                    secondaryCase = "68";
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 6) === '105bfd' || hexData.substring(0, 6) === '107bfd') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for Class 2 Data ID FD - ' + secondaryCase);
                    if (secondaryCase === "62") {
                        sendBuf = Buffer.from('681010680800725316006296150331170000000f4a16', 'hex');
                    } else if (secondaryCase === "68") {
                        sendBuf = Buffer.from('681111680802726447026896151f1b2a000000000faf16', 'hex');
                    } else {
                        sendBuf = Buffer.from('6815156808017220438317b40901072b0000000c13180000009f16', 'hex');
                    }
                    sendMessage(socket, sendBuf);
                } else if (hexData.substring(0, 20) === '68060668530151017a03') {
                    console.log(new Date().toString() + ':     mbus-Serial-Device: Request for ID Change 1 -> 3');
                    sendBuf = Buffer.from('E5', 'hex');
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

            let socat;
            let command;
            if (os.platform() !== 'win32') {
                socat = spawn('socat', ['-D', '-x', '-s', 'pty,link=/tmp/virtualcom0,ispeed=9600,ospeed=9600,raw', 'tcp:127.0.0.1:15001']);
                command = 'socat';
            }
            else { // for manual tests use com0com to create a virtual COM pair and com2tcp to direct one side to tcp
                socat = spawn('com2tcp.exe', ['--ignore-dsr', '--baud', '9600', '--parity', 'e', '\\\\.\\CNCA0', '127.0.0.1', '15001']);
                command = 'com2tcp';
            }
            console.log('mbus-Serial-Device: ' + command + ' spawned');
            socat.stdout.on('data', function(data) {
              console.log(command + ' stdout: ' + data);
            });

            socat.stderr.on('data', function(data) {
              console.log(command + ' stderr: ' + data);
            });

            socat.on('close', function(code) {
              console.log(command + ' child process exited with code ' + code);
            });

            setTimeout(function() {
                let mbusOptions;
                if (os.platform() !== 'win32') {
                    mbusOptions = {
                        serialPort: '/tmp/virtualcom0',
                        serialBaudRate: 9600
                    };
                }
                else {
                    mbusOptions = {
                        serialPort: '\\\\.\\CNCB0',
                        serialBaudRate: 9600
                    };
                }
                const mbusMaster = new MbusMaster(mbusOptions);
                const connectResult = mbusMaster.connect();
                console.log(new Date().toString() + ': mbus-Serial-Master Open:' + connectResult);
                if (!connectResult) {
                    socat.kill('SIGKILL');
                    testSocket && testSocket.destroy();
                    server.close();
                }
                var emergencyTimeout = setTimeout(function() {
                    socat.kill('SIGKILL');
                    testSocket && testSocket.destroy();
                    server.close();
                    done();
                }, 60000); // Killswitch!
                expect(mbusMaster.mbusMaster.connected).to.be.true;
                expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;
                setTimeout(function() {
                    console.log(new Date().toString() + ': mbus-Serial-Master Send "Get 1"');

                    mbusMaster.getData(1, function(err, data) {
                        console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                        console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                        expect(err).to.be.null;
                        expect(data.SlaveInformation.Id).to.be.equal(11490378);
                        expect(data.DataRecord[0].Value).to.be.equal(11490378);
                        expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                        mbusMaster.getData(2, function(err, data) {
                            console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                            console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                            expect(err).to.be.null;
                            expect(data.SlaveInformation.Id).to.be.equal('500023E');
                            expect(data.DataRecord[0].Value).to.be.equal(1252);
                            expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                            mbusMaster.setPrimaryId(1, 3, function(err) {
                                console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                                expect(err).to.be.null;
                                expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                                mbusMaster.scanSecondary(function(err, data) {
                                    console.log(new Date().toString() + ': mbus-Serial-Master err: ' + err);
                                    console.log(new Date().toString() + ': mbus-Serial-Master data: ' + JSON.stringify(data, null, 2));
                                    expect(err).to.be.null;
                                    expect(data).to.be.an('array');
                                    expect(data.length).to.be.equal(3);
                                    expect(data[0]).to.be.equal('17834320B4090107');
                                    expect(data[1]).to.be.equal('6200165396150331');
                                    expect(data[2]).to.be.equal('6802476496151F1B');
                                    expect(mbusMaster.mbusMaster.communicationInProgress).to.be.false;

                                    if (emergencyTimeout) clearTimeout(emergencyTimeout);
                                    setTimeout(function() {
                                        console.log(new Date().toString() + ': mbus-Serial-Master Close: ' + mbusMaster.close());
                                        socat.kill('SIGKILL');
                                        console.log('mbus-Serial-Device: Socat killed');
                                        setTimeout(function() {
                                            server.close(function(err) {
                                                testSocket.destroy();
                                                console.log('mbus-Serial-Device: Server closed');
                                                clearTimeout(emergencyTimeout);
                                                setTimeout(done, 2000);
                                            });
                                        }, 1000);
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
            }, 2000);
        });

        server.listen(port, '127.0.0.1');
    });
});
