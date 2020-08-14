const Mustache = require('mustache');

const log = require('./log');

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
      "razee-org-key": "{{orgKey}}"
    }
  }
}`;
  
const createRemoteResources = async (razeeApi, apiKey, subscriptions) => {
  log.info('create remote resources subscription list', {subscriptions} );
  try {
    const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
    return Promise.all(subscriptions.map( async sub => {
      const url = `${razeeApi}/${sub.url}`;
      const rendered = Mustache.render(requestsTemplate, { url: url, orgKey: apiKey });
      const parsed = JSON.parse(rendered);
      const resourceName = `clustersubscription-${sub.subscription_uuid}`;
      const resourceTemplate = {
        'apiVersion': API_VERSION,
        'kind': KIND,
        'metadata': {
          'namespace': NAMESPACE,
          'name': resourceName,
          'annotations': {
            'deploy.razee.io/clustersubscription': sub.subscription_uuid
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

const getRemoteResources = async () => {
  log.debug('Getting a list of clustersubscription remote resources on this cluster');
  let remoteResources = [];
  try {
    const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'get');
    const opt = { simple: false, resolveWithFullResponse: true };
    const get = await krm.get('', NAMESPACE, opt);
    if(get.statusCode === 200) {
      remoteResources = get.body.items.filter( (item) => {
        return item.metadata.annotations && item.metadata.annotations['deploy.razee.io/clustersubscription'];
      });
    }
  } catch (error) {
    log.error(error);
  }
  return remoteResources;
};

exports.createRemoteResources = createRemoteResources;
exports.getRemoteResources = getRemoteResources;
exports.deleteRemoteResources = deleteRemoteResources;
