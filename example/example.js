var MbusMaster = require('../index.js');

/*
var mbusOptions = {
    host: '127.0.0.1',
    port: port,
    autoConnect: true
};
*/
var mbusOptions = {
    serialPort: 'COM9',
    serialBaudRate: 2400,
    autoConnect: true
};

var mbusMaster = new MbusMaster(mbusOptions);

if (!mbusMaster.connect()) {
    console.log('Connection failed.');
    process.exit();
}

// request for data from devide with ID 1
mbusMaster.getData(1, function(err, data) {
    console.log('err: ' + err);
    console.log('data: ' + JSON.stringify(data, null, 2));

    mbusMaster.scanSecondary(function(err, data) {
        console.log('err: ' + err);
        console.log('data: ' + JSON.stringify(data, null, 2));

        mbusMaster.close();
    });
});
