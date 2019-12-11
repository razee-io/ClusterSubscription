
const io = require('socket.io-client');
const CryptoJS = require('crypto-js');

function decryptYaml(str) {
  return CryptoJS.AES.decrypt(str, process.env.RAZEE_ORG_KEY).toString(CryptoJS.enc.Utf8);
}

var socket = io(process.env.RAZEE_API, { 
  query: {
    'razee-org-key': process.env.RAZEE_ORG_KEY,
    'tags': process.env.RAZEE_TAGS
  },
});

socket.connect(); 

// listen for subscription changes
socket.on('subscriptions', function(data) {
  console.log('Received subscription data from razeeapi');
  console.log(data);
});

// Add a connect listener
socket.on('connect',function() {
  console.log('Client has connected to the server!');
});

// Add a disconnect listener
socket.on('disconnect',function() {
	console.log('The client has disconnected!');
});
