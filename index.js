
const io = require('socket.io-client');
const Mustache = require('mustache');
const template = require('./resourceTemplate');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);
// console.log(kc);

// const k8s = require('@kubernetes/client-node');
// const kc = new k8s.KubeConfig();
// kc.loadFromCluster();
// const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
// k8sApi.listNamespacedPod('razee')
//     .then((res) => {
// 	console.log(res.body);
//     })
//     .catch((err) => {
//         console.log(err);
//     });

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
socket.on('subscriptions', async function(urls) {
  console.log('Received subscription data from razeeapi');
  const yaml = Mustache.render(template, {
    urls,
    orgKey: ORG_KEY
  });
  console.log(yaml);
  let apiVersion = 'deploy.razee.io/v1alpha1';
  let kind = 'RemoteResource';
  let krm = await kc.getKubeResourceMeta(apiVersion, kind, 'update');
  try {
      // console.log('post --------------------');
      // const post = await krm.post(JSON.parse(yaml));
      // console.log(post);
    krm.get('subscription-genned-deployables', 'razee')
    .then( (data) => {
      console.log('return from promise');
      console.log(data);
    })
    .catch( (error) => {
      console.log('error from promise');
      console.log(error);
    });
    // let get = await krm.get('subscription-genned-deployables', 'razee');
    // if (get.statusCode === 200) {
    //   console.log('mergePatch --------------------');
    //   const mergePatch = await krm.mergePatch('subscription-genned-deployables','razee', JSON.parse(yaml));
    //   console.log(mergePatch);
    // } else if (get.statusCode === 404) {
    //   console.log('post --------------------');
    //   const post = await krm.post(JSON.parse(yaml));
    //   console.log(post.statusCode);
    // } else {
    //   console.log('blargh!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    //   console.log(get);
    // }

    // if(post.statusCode === 409) {
    //   console.log('resource already exists.  trying mergePatch now');
    // }
    // let post = await krm.mergePatch('subscription-genned-deployables','razee', JSON.parse(yaml));
    
    // if (!(post.statusCode === 200 || post.statusCode === 201 || post.statusCode === 202)) {
    //   console.log('non 200, 201, 202');
    //   console.log(post.statusCode);
    // } else {
    //   console.log(post.statusCode);
    // }
    
  } catch (error) {
    console.log('################## caught error ######################');
    console.log(error.statusCode);
    console.log(error.message);
    console.log(error.options);
  }

});

// Add a connect listener
socket.on('connect',function() {
  console.log('Client has connected to the server!');
});

// Add a disconnect listener
socket.on('disconnect',function() {
	console.log('The client has disconnected!');
});
