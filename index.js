
const io = require('socket.io-client');
const CryptoJS = require('crypto-js');
const Mustache = require('mustache');
const template = require('./resourceTemplate');

const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;
const RAZEE_TAGS = process.env.RAZEE_TAGS;

function decryptYaml(str) {
  return CryptoJS.AES.decrypt(str, ORG_KEY).toString(CryptoJS.enc.Utf8);
}

const socket = io(RAZEE_API, { 
  query: {
    'razee-org-key': ORG_KEY,
    'tags': RAZEE_TAGS
  },
});

socket.connect(); 

// listen for subscription changes
socket.on('subscriptions', function(urls) {
  console.log('Received subscription data from razeeapi');
  const yaml = Mustache.render(template, {
    urls,
    orgKey: ORG_KEY
  });
  console.log(yaml);
});

// Add a connect listener
socket.on('connect',function() {
  console.log('Client has connected to the server!');
});

// Add a disconnect listener
socket.on('disconnect',function() {
	console.log('The client has disconnected!');
});
