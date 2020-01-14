
const io = require('socket.io-client');
const Mustache = require('mustache');
const template = require('./resourceTemplate');

const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;
const RAZEE_TAGS = process.env.RAZEE_TAGS;

if(!ORG_KEY){
  throw `Please specify process.env.RAZEE_ORG_KEY`;
}
if(!RAZEE_API){
  throw `Please specify process.env.RAZEE_API`;
}

const socket = io(RAZEE_API, { 
  query: {
    action: 'subscriptions',
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
