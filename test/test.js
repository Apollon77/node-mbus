var mbus = require('bindings')('mbus')();
console.log('Open:',mbus.openSerial('/dev/pts/5',2400));
mbus.get(21,function(err,data){
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