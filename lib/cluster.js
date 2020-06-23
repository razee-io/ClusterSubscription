const log = require('./log');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

const NAMESPACE = process.env.NAMESPACE;
const resourceName = 'razee-identity'; 

function base64Decode(o) {
  return Buffer.from(o, 'base64').toString('utf8');
}

const getClusterConfig = async () => {
  log.debug('Gathering cluster config');
  const config = {
    'razeeApi': '',
    'apiKey': '',
    'clusterId': ''
  };
  const opt = { simple: false, resolveWithFullResponse: true };
  let krm, get;

  log.info('Getting cluster id and razee host');
  try {
    krm = await kc.getKubeResourceMeta('v1', 'ConfigMap', 'get');
    get = await krm.get(resourceName, NAMESPACE, opt);
    if(get.statusCode === 200) {
      const trailingSlash = /\/*$/gi;
      config.razeeApi = get.body.data['RAZEE_API'].replace(trailingSlash, '');
      config.clusterId = get.body.data['CLUSTER_ID']; 
    }
  } catch (error) {
    console.error(error);
  }

  log.info('Getting razee api key');
  try {
    krm = await kc.getKubeResourceMeta('v1', 'Secret', 'get');
    get = await krm.get(resourceName, NAMESPACE, opt);
    if(get.statusCode === 200) {
      config.apiKey = base64Decode(get.body.data['RAZEE_ORG_KEY']);
    }
  } catch (error) {
    console.error(error);
  }

  return config;
};

exports.getClusterConfig = getClusterConfig;
