require('dpd-router-middleware')(require('deployd/lib/router'), 'middleware');

// production.js
var deployd = require('deployd');

var server = deployd({
  port: process.env.PORT || 5000,
  env: 'development',
  db: {
    host: '127.0.0.1',
    port: 27017,
    name: 'seed'
  }
});

server.listen(5000, '127.0.0.1');

server.on('listening', function() {
  console.log("Server is listening");
});

server.on('error', function(err) {
  console.error(err);
  process.nextTick(function() { // Give the server a chance to return an error
    process.exit();
  });
});
