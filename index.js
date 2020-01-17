const io = require('socket.io-client');
const Mustache = require('mustache');

const log = require('./lib/bunyan-api').createLogger('cluster-subscription');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;
const RAZEE_TAGS = process.env.RAZEE_TAGS;

if(!ORG_KEY){
  throw `Please specify process.env.RAZEE_ORG_KEY`;
}
if(!RAZEE_API){
  throw `Please specify process.env.RAZEE_API`;
}

const API_VERSION="deploy.razee.io/v1alpha1";
const KIND="RemoteResource";
const RESOURCE_NAME="clustersubscription-rr";
const NAMESPACE="razee";

const socket = io(RAZEE_API, { 
  query: {
    action: 'subscriptions',
    'razee-org-key': ORG_KEY,
    'tags': RAZEE_TAGS
  },
});

socket.connect();

async function applyResource(krm, resource, mode) {
  return new Promise(async function(resolve, reject) {
    try {
      let result;
      if(mode === 'post') {
        result = await krm.post(resource);
      }else if(mode === 'mergePatch') {
        result = await krm.mergePatch(RESOURCE_NAME, NAMESPACE, resource);
      }
      resolve(result);
    } catch (error) {
      log.warn(`error applying yaml using ${mode}. rc: ${error.statusCode}`);
      reject(error.statusCode); 
    }
  });
}

// listen for subscription changes
socket.on('subscriptions', async function(urls) {
  log.info('Received subscription data from razeeapi', urls);

  const resourceTemplate = {
    "apiVersion": API_VERSION,
    "kind": KIND,
    "metadata": {
      "name": RESOURCE_NAME,
      "namespace": NAMESPACE,
    },
    "spec": {
      "requests": []
    }
  };

  const requestsTemplate = `{
    "options": {
      "url": "{{{url}}}",
      "headers": {
        "razee-org-key": "{{orgKey}}"
      }
    }
  }`;

  urls.forEach(url => {
    url = `${RAZEE_API}/${url}`;
    let rendered = Mustache.render(requestsTemplate, { url: url, orgKey: ORG_KEY });
    let parsed = JSON.parse(rendered);
    resourceTemplate.spec.requests.push(parsed);
  });

  let krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
  
  // apply the RemoteResource on the cluster.  First try a post (for a brand new resource).  
  // If the post fails with a 409 then the resource already exists on the cluster so try a mergePatch instead.
  try {
    const postResults = await applyResource(krm, resourceTemplate, 'post');
    log.info('remote resource applied', postResults);
  } catch (error) {
    if(error === 409) {
      const patchResults = await applyResource(krm, resourceTemplate, 'mergePatch');
      log.info('remote resource re-applied', patchResults);
    } else {
      log.error('Could not apply the resource.', resourceTemplate, error);
    }
  }
});

socket.on('connect',function() {
  log.info('Client has connected to the server!');
});

socket.on('disconnect',function() {
	log.info('The client has disconnected!');
});
