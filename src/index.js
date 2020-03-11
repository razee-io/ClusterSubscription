const io = require('socket.io-client');
const Mustache = require('mustache');
const _ = require('lodash');

const log = require('../lib/bunyan-api').createLogger('cluster-subscription');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;
const RAZEE_TAGS = process.env.RAZEE_TAGS;

if (!ORG_KEY) {
  throw 'Please specify process.env.RAZEE_ORG_KEY';
}
if (!RAZEE_API) {
  throw 'Please specify process.env.RAZEE_API';
}

// strip any trailing / from RAZEE_API
const regex = /\/*$/gi;
const API_HOST = RAZEE_API.replace(regex, '');

const API_VERSION = 'deploy.razee.io/v1alpha2';
const KIND = 'RemoteResource';
const RESOURCE_NAME = 'clustersubscription-rr';
const NAMESPACE = process.env.NAMESPACE;

const socket = io(RAZEE_API, {
  query: {
    action: 'subscriptions',
    'razee-org-key': ORG_KEY,
    'tags': RAZEE_TAGS
  },
  transports: ['websocket']
});

socket.connect();

// listen for subscription changes
socket.on('subscriptions', async function (data) {
  log.info('Received subscription data from razeeapi', data);

  var urls = data.urls;
  if (_.isArray(data)) {
    urls = data;
  }

  const resourceTemplate = {
    'apiVersion': API_VERSION,
    'kind': KIND,
    'metadata': {
      'name': RESOURCE_NAME,
      'namespace': NAMESPACE,
    },
    'spec': {
      'requests': []
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
    url = `${API_HOST}/${url}`;
    let rendered = Mustache.render(requestsTemplate, { url: url, orgKey: ORG_KEY });
    let parsed = JSON.parse(rendered);
    resourceTemplate.spec.requests.push(parsed);
  });

  const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
  const opt = { simple: false, resolveWithFullResponse: true };

  const uri = krm.uri({ name: RESOURCE_NAME, namespace: NAMESPACE });
  const get = await krm.get(RESOURCE_NAME, NAMESPACE, opt);
  log.info(`Get ${get.statusCode} ${uri}`);
  if (get.statusCode === 200) {
    // the remote resource already exists so use mergePatch to apply the resource
    const mergeResult = await krm.mergePatch(RESOURCE_NAME, NAMESPACE, resourceTemplate, opt);
    if (mergeResult.statusCode === 200) {
      log.info('mergePatch successful', mergeResult.statusCode, mergeResult.statusMessage, mergeResult.body);
    } else {
      log.error('mergePatch error', mergeResult.statusCode, mergeResult.statusMessage, mergeResult.body);
    }
  } else if (get.statusCode === 404) {
    // the remote resource does not exist so use post to apply the resource
    const postResult = await krm.post(resourceTemplate, opt);
    if (postResult.statusCode === 200 || postResult.statusCode === 201) {
      log.info('post successful', postResult.statusCode, postResult.statusMessage, postResult.body);
    } else {
      log.error('post error', postResult.statusCode, postResult.statusMessage, postResult.body);
    }
  } else {
    log.error(`Get ${get.statusCode} ${uri}`);
  }

});

socket.on('connect', function () {
  log.info('Client has connected to the server!');
});

socket.on('disconnect', function () {
  log.info('The client has disconnected!');
});

socket.on('connect_error', (error) => {
  log.error(error);
});
