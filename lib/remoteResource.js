const Mustache = require('mustache');

const log = require('./log');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const objectPath = require('object-path');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

const RR_API_VERSION = 'deploy.razee.io/v1alpha2';
const NAMESPACE = process.env.NAMESPACE;

const requestsTemplate = `{
  "options": {
    "url": "{{{url}}}",
    "headers": {
      "razee-org-key":
        "valueFrom":
          "secretKeyRef":
            "name": "clustersubscription-{{subscriptionUuid}}-secret"
            "namespace": {{namespace}}
            "key": "razee-api-org-key"
    }
  }
}`;

const createRemoteResources = async (razeeApi, apiKey, subscriptions, clusterId) => {
  log.info('create remote resources subscription list', { subscriptions });
  try {
    return Promise.all(subscriptions.map(async sub => {
      const url = `${razeeApi}/${sub.url}`;
      const rendered = Mustache.render(requestsTemplate, { url: url, orgKey: apiKey, namespace: NAMESPACE });
      const parsed = JSON.parse(rendered);
      const remoteResourceName = `clustersubscription-${sub.subscriptionUuid}`;
      const secretName = `clustersubscription-${sub.subscriptionUuid}-secret`;
      const userName = (sub.kubeOwnerName && typeof sub.kubeOwnerName === 'string') ? sub.kubeOwnerName : 'razeedeploy';
      const remoteResourceJson = {
        'apiVersion': RR_API_VERSION,
        'kind': 'RemoteResource',
        'metadata': {
          'namespace': NAMESPACE,
          'name': remoteResourceName,
          'annotations': {
            'deploy.razee.io/clustersubscription': sub.subscriptionUuid,
            'deploy.razee.io/clusterid': clusterId
          },
          'labels': {
            'razee/watch-resource': 'lite'
          }
        },
        'spec': {
          'clusterAuth': {
            'impersonateUser': userName
          },
          'requests': []
        }
      };
      remoteResourceJson.spec.requests.push(parsed);
      
      const secretJson = {
        'apiVersion': 'v1',
        'kind': 'Secret',
        'metadata': {
          'namespace': NAMESPACE,
          'name': secretName,
          'annotations': {
            'deploy.razee.io/clustersubscription': sub.subscriptionUuid,
            'deploy.razee.io/clusterid': clusterId
          },
          'labels': {
            'razee/watch-resource': 'lite'
          }
        },
        'data': {
          'razee-api-org-key': apiKey
        }
      };


      await applyResource(remoteResourceJson);
      await applyResource(secretJson);
    }));

  } catch (error) {
    log.error('There was an error creating remote resources', { error });
  }
};

const applyResource = async (resourceJson) => {
  const resourceName = objectPath.get(resourceJson, 'metadata.name', '');
  const resourceNamespace = objectPath.get(resourceJson, 'metadata.namespace', NAMESPACE);
  const resourceApiVersion = objectPath.get(resourceJson, 'apiVersion', RR_API_VERSION);
  const resourceKind = objectPath.get(resourceJson, 'kind', '');
  const opt = { simple: false, resolveWithFullResponse: true };
  const krm = await kc.getKubeResourceMeta(resourceApiVersion, resourceKind, 'update');
  const uri = krm.uri({ name: resourceName, namespace: resourceNamespace });
  log.debug(resourceName);
  const get = await krm.get(resourceName, resourceNamespace, opt);
  if (get.statusCode === 200) {
    // the remote resource already exists so use mergePatch to apply the resource
    log.info(`Attempting mergePatch for an existing resource ${uri}`);
    const mergeResult = await krm.mergePatch(resourceName, resourceNamespace, resourceJson, opt);
    if (mergeResult.statusCode === 200) {
      log.info('mergePatch successful', { 'statusCode': mergeResult.statusCode, 'statusMessage': mergeResult.statusMessage });
    } else {
      log.error('mergePatch error', { 'statusCode': mergeResult.statusCode, 'statusMessage': mergeResult.statusMessage });
    }
  } else if (get.statusCode === 404) {
    // the remote resource does not exist so use post to apply the resource
    log.info(`Attempting post for a new resource ${uri}`);
    const postResult = await krm.post(resourceJson, opt);
    if (postResult.statusCode === 200 || postResult.statusCode === 201) {
      log.info('post successful', { 'statusCode': postResult.statusCode, 'statusMessage': postResult.statusMessage });
    } else {
      log.error('post error', { 'statusCode': postResult.statusCode, 'statusMessage': postResult.statusMessage });
    }
  } else {
    log.error(`Get ${get.statusCode} ${uri}`);
  }
};


const deleteRemoteResources = async (resources) => {
  const krm = await kc.getKubeResourceMeta(RR_API_VERSION, 'RemoteResource', 'update');
  const rrSelfLinks = resources.map((resource) => krm.uri({ name: resource.metadata.name, namespace: resource.metadata.namespace }));
  log.debug('Deleting', { rrSelfLinks });
  await deleteResource(rrSelfLinks, krm);
  const krm_secret = await kc.getKubeResourceMeta('v1', 'Secret', 'update');
  const secretSelfLinks = resources.map((resource) => krm_secret.uri({ name: `${resource.metadata.name}-secret`, namespace: resource.metadata.namespace, }));
  log.debug('Deleting', { secretSelfLinks });
  await deleteResource(secretSelfLinks, krm_secret);
};

const deleteResource = async(selfLinks, krm) => {
  try {
    selfLinks.map(async (selfLink) => {
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
    const krm = await kc.getKubeResourceMeta(RR_API_VERSION, 'RemoteResource', 'get');
    const opt = { simple: false, resolveWithFullResponse: true };
    const get = await krm.get('', NAMESPACE, opt);
    if (get.statusCode === 200) {
      remoteResources = get.body.items.filter((item) => {
        if (item.metadata.annotations && item.metadata.annotations['deploy.razee.io/clustersubscription']) {
          log.debug('existing remote-resource', { name: item.metadata.name }, { annotation: item.metadata.annotations['deploy.razee.io/clustersubscription'] });
          if (item.metadata.annotations['deploy.razee.io/clusterid']) {
            if (item.metadata.annotations['deploy.razee.io/clusterid'] === clusterId) {
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

exports.createRemoteResources = createRemoteResources;
exports.getRemoteResources = getRemoteResources;
exports.deleteRemoteResources = deleteRemoteResources;
exports.applyResource = applyResource;
