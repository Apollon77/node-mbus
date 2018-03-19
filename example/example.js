var MbusMaster = require('../index.js');

/* CONNECTION EXAMPLES

var mbusOptions = {
host: '127.0.0.1',
port: port,
autoConnect: true
};

var mbusOptions = {
    serialPort: '/dev/ttyUSB0',
    serialBaudRate: 9600,
    autoConnect: true
};

*/

var mbusOptions = {};

function logUsage(){
  console.log("USAGE");
  console.log("SERIAL: node ./example/example.js -serialPort /dev/ttyUSB0 -serialBaudrate 9600 -autoConnect true");
  console.log("TCP: node ./example/example.js -host 127.0.0.1 -port 2000 -autoConnect true");
}

//PARSE OPTIONS
var args = process.argv.slice(2);

for (var i = 0; i < args.length; i++) {
  if(args[i].startsWith('-'))
    mbusOptions[args[i].substring(1)] = i+1 < args.length ? args[++i].trim() : null;
}

mbusOptions.autoConnect = mbusOptions.autoConnect === 'true';

if(mbusOptions.serialPort && !mbusOptions.serialBaudrate){
  console.log("Missing serial baudRate");
  logUsage();
}
else if(!mbusOptions.serialPort && mbusOptions.serialBaudrate){
  console.log("Missing serial port");
  logUsage();
}
else if(mbusOptions.host && !mbusOptions.port){
  console.log("Missing TCP port");
  logUsage();
}
else if(!mbusOptions.host && mbusOptions.port){
  console.log("Missing TCP host");
  logUsage();
}
else{

  console.log("Connecting with options: " + JSON.stringify(mbusOptions, null, 2));

  var mbusMaster = new MbusMaster(mbusOptions);

  if (!mbusMaster.connect()) {
    console.log('Connection failed.');
    process.exit();
  }

  console.log('Reading device ID 1...');

  // request for data from devide with ID 1
  mbusMaster.getData(1, function(err, data) {
    console.log('err: ' + err);
    console.log('data: ' + JSON.stringify(data, null, 2));

    console.log('Scanning network...');

    mbusMaster.scanSecondary(function(err, data) {
      console.log('err: ' + err);
      console.log('data: ' + JSON.stringify(data, null, 2));

      console.log('Closing client...');
      mbusMaster.close();
    });
  });
}
