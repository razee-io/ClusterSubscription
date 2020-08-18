const Mustache = require('mustache');

const log = require('./log');
const objectPath = require('object-path');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

const API_VERSION = 'deploy.razee.io/v1alpha2';
const KIND = 'RemoteResource';
const NAMESPACE = process.env.NAMESPACE;

const requestsTemplate = `{
  "options": {
    "url": "{{{url}}}",
    "headers": {
      "razee-org-key":
        "valueFrom":
          "secretKeyRef":
            "name": "razee-identity"
            "namespace": "razeedeploy"
            "key": "RAZEE_ORG_KEY"
    }
  }
}`;
  
const createRemoteResources = async (razeeApi, apiKey, subscriptions, clusterId) => {
  log.info('create remote resources subscription list', {subscriptions} );
  try {
    await createIdentitySecret(apiKey);
    const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
    return Promise.all(subscriptions.map( async sub => {
      const url = `${razeeApi}/${sub.url}`;
      const rendered = Mustache.render(requestsTemplate, { url: url, orgKey: apiKey });
      const parsed = JSON.parse(rendered);
      const resourceName = `clustersubscription-${sub.subscriptionUuid}`;
      const resourceTemplate = {
        'apiVersion': API_VERSION,
        'kind': KIND,
        'metadata': {
          'namespace': NAMESPACE,
          'name': resourceName,
          'annotations': {
            'deploy.razee.io/clustersubscription': sub.subscriptionUuid,
            'deploy.razee.io/clusterid': clusterId
          },
          'labels': {
            'razee/watch-resource': 'lite'
          }
        },
        'spec': {
          'requests': []
        }
      };
      resourceTemplate.spec.requests.push(parsed);

      const opt = { simple: false, resolveWithFullResponse: true };

      const uri = krm.uri({ name: resourceName, namespace: NAMESPACE });
      log.debug(resourceName);
      const get = await krm.get(resourceName, NAMESPACE, opt);
      if (get.statusCode === 200) {
        // the remote resource already exists so use mergePatch to apply the resource
        log.info(`Attempting mergePatch for an existing resource ${uri}`);
        const mergeResult = await krm.mergePatch(resourceName, NAMESPACE, resourceTemplate, opt);
        if (mergeResult.statusCode === 200) {
          log.info('mergePatch successful', {'statusCode': mergeResult.statusCode, 'statusMessage': mergeResult.statusMessage, 'body': mergeResult.body});
        } else {
          log.error('mergePatch error', {'statusCode': mergeResult.statusCode, 'statusMessage': mergeResult.statusMessage, 'body': mergeResult.body});
        }
      } else if (get.statusCode === 404) {
        // the remote resource does not exist so use post to apply the resource
        log.info(`Attempting post for a new resource ${uri}`);
        const postResult = await krm.post(resourceTemplate, opt);
        if (postResult.statusCode === 200 || postResult.statusCode === 201) {
          log.info('post successful', {'statusCode': postResult.statusCode, 'statusMessage': postResult.statusMessage, 'body': postResult.body});
        } else {
          log.error('post error', {'statusCode': postResult.statusCode, 'statusMessage': postResult.statusMessage, 'body': postResult.body});
        }
      } else {
        log.error(`Get ${get.statusCode} ${uri}`);
      }
    }));

  } catch (error) {
    log.error('There was an error creating remote resources', {error});
  }

};

const deleteRemoteResources = async (selfLinks) => {
  log.debug('Deleting', {selfLinks});
  const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
  try {
    selfLinks.map( async (selfLink) => {
      log.info(`Delete ${selfLink}`);
      const opt = { uri: selfLink, simple: false, resolveWithFullResponse: true, method: 'DELETE' };
      const res = await krm.request(opt);
      if (res.statusCode === 404) {
        log.info(`Delete ${res.statusCode} ${opt.uri}`);
        return { statusCode: res.statusCode, body: res.body };
      } else if (res.statusCode !== 200) {
        log.info(`Delete ${res.statusCode} ${opt.uri}`);
        return Promise.reject({ statusCode: res.statusCode, body: res.body });
      }
      log.info(`Delete ${res.statusCode} ${opt.uri}`);
      return { statusCode: res.statusCode, body: res.body };
    });
  } catch (error) {
    log.error(error);
  }
};

const getRemoteResources = async (clusterId) => {
  log.debug('Getting a list of clustersubscription remote resources on this cluster');
  let remoteResources = [];
  try {
    const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'get');
    const opt = { simple: false, resolveWithFullResponse: true };
    const get = await krm.get('', NAMESPACE, opt);
    if(get.statusCode === 200) {
      remoteResources = get.body.items.filter( (item) => {
        if(item.metadata.annotations && item.metadata.annotations['deploy.razee.io/clustersubscription'] ) {
          if(item.metadata.annotations['deploy.razee.io/clusterid']) {
            if(item.metadata.annotations['deploy.razee.io/clusterid'] === clusterId) {
              return item.metadata.annotations['deploy.razee.io/clustersubscription'];
            }
          } else {
            return item.metadata.annotations['deploy.razee.io/clustersubscription'];
          } 
        } 
      });
    }
  } catch (error) {
    log.error(error);
  }
  return remoteResources;
};

const createIdentitySecret = async (apiKey) => {
  try {
    const secretKrm = await kc.getKubeResourceMeta('v1', 'Secret', 'update');
    const razeeIdSecret = {
      'apiVersion': 'v1',
      'kind': 'Secret',
      'metadata': {
        'name': 'razee-identity',
        'namespace': `${NAMESPACE}`
      },
      'data': {
        'RAZEE_ORG_KEY': `${Buffer.from(apiKey).toString('base64')}`
      }
    };
    await ensureExists(secretKrm, razeeIdSecret);
  } catch (e) {
    log.error('There was an error creating the razee-identity secret', { e });
  }
};

const ensureExists = async (krm, file, options = {}) => {
  let name = objectPath.get(file, 'metadata.name');
  let namespace = objectPath.get(file, 'metadata.namespace');
  let uri = krm.uri({ name: name, namespace: namespace, status: options.status });
  log.info(`Attempting ensureExists for secret ${uri}`);
  let opt = { simple: false, resolveWithFullResponse: true };

  let get = await krm.get(name, namespace, opt);
  if (get.statusCode === 200) {
    log.info('ensureExists successful', { 'statusCode': get.statusCode, 'statusMessage': get.statusMessage, 'body': get.body });
  } else if (get.statusCode === 404) { // not found -> must create
    log.debug(`Get ${get.statusCode} ${uri}`);
  } else {
    log.error('ensureExists error', { 'statusCode': get.statusCode, 'statusMessage': get.statusMessage, 'body': get.body });
  }

  log.debug(`Post ${uri}`);
  let post = await krm.post(file, opt);
  if (post.statusCode === 200 || post.statusCode === 201 || post.statusCode === 202) {
    log.info('ensureExists successful', { 'statusCode': post.statusCode, 'statusMessage': post.statusMessage, 'body': post.body });
  } else if (post.statusCode === 409) { // already exists
    log.info('ensureExists successful', { 'statusCode': post.statusCode, 'statusMessage': post.statusMessage, 'body': post.body });
  } else {
    log.error('ensureExists error', { 'statusCode': post.statusCode, 'statusMessage': post.statusMessage, 'body': post.body });
  }
};

exports.createRemoteResources = createRemoteResources;
exports.getRemoteResources = getRemoteResources;
exports.deleteRemoteResources = deleteRemoteResources;
