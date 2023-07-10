const log = require('../lib/log');
const { createRemoteResources, getRemoteResources, deleteRemoteResources } = require('../lib/remoteResource');
const { webSocketClient } = require('../lib/websocket');
const { getSubscriptionsByCluster } = require('../lib/queries');
const touch = require('touch');
const Config = require('./Config');

const razeeListener = async (razeeApi, clusterId) => {
  webSocketClient(razeeApi).subscribe((event) => {
    log.info('Received an event from razeedash-api', event);
    if (event.data && event.data.subscriptionUpdated && event.data.subscriptionUpdated.hasUpdates) {
      callRazee(razeeApi, clusterId);
    } else {
      log.error(`Received graphql error from ${razeeApi}/graphql`, { 'error': event });
    }
  }, (error) => {
    log.error(`Error creating a connection to ${razeeApi}/graphql`, { error });
  });
};

const callRazee = async (razeeApi, clusterId) => {

  // rr's on this cluster with the 'deploy.razee.io/clustersubscription' annotation
  const clusterResources = await getRemoteResources(clusterId);

  // list of razee subscriptions for this cluster
  const res = await getSubscriptionsByCluster(razeeApi, Config.orgKey, clusterId).catch(() => false);
  const subscriptions = (res && res.data && res.data.subscriptionsByClusterId) ? res.data.subscriptionsByClusterId : false;
  log.debug('razee subscriptions', { subscriptions });

  //
  // Create remote resources
  //
  if (subscriptions && subscriptions.length > 0) {
    await createRemoteResources(razeeApi, Config.orgKey, subscriptions, clusterId);
    log.info('finished creating remote resources');
  }

  //
  // Delete remote resources
  //
  if (subscriptions && clusterResources && clusterResources.length > 0) {
    log.info('looking for remote resources to delete...');

    const subscriptionUuids = subscriptions.map((sub) => sub.subscriptionUuid); // uuids from razee
    const invalidResources = clusterResources.filter((rr) => {
      // the annotation looks like: deploy.razee.io/clustersubscription: 89cd2717-c7f5-43d6-91a7-fd1ec44e1abb
      return subscriptionUuids.includes(rr.metadata.annotations['deploy.razee.io/clustersubscription']) ? false : true;
    });

    if (invalidResources.length > 0) {
      await deleteRemoteResources(invalidResources);
    } else {
      log.debug('existing remote resources are valid. nothing to delete');
    }
  }
};

async function main() {
  await Config.init();

  const apiKey = Config.orgKey;
  const razeeApi = Config.razeeApi;
  const clusterId = Config.clusterId;

  if (!apiKey) {
    throw 'RAZEE_ORG_KEY is missing';
  }
  if (!razeeApi) {
    throw 'RAZEE_API is missing';
  }
  if (!clusterId) {
    throw 'CLUSTER_ID is missing';
  }

  log.debug({ razeeApi, clusterId });

  const apiHost = Config.razeeApi.replace(/\/*$/gi, ''); // strip any trailing /'s from razeeApi

  setInterval(async () => await touch('/tmp/liveness'), 60000); // used with the k8s liveness probe
  razeeListener(apiHost, Config.clusterId); // create a websocket connection to razee
  callRazee(apiHost, Config.clusterId); // query razee for updated subscriptions
  setInterval(() => callRazee(apiHost, Config.clusterId), 300000); // catch possible missed events from the websocket connection. issue #70
}

function createEventListeners() {
  process.on('SIGTERM', () => {
    log.info('recieved SIGTERM. not handling at this time.');
  });
  process.on('unhandledRejection', (reason) => {
    log.error('recieved unhandledRejection', reason);
  });
  process.on('beforeExit', (code) => {
    log.info(`No work found. exiting with code: ${code}`);
  });

}

async function run() {
  try {
    createEventListeners();
    await main();
  } catch (error) {
    log.error(error);
    process.exit( 50 ); // 50 used to determine caught error exit (as opposed to module load errors which will exit with 1 before `run()` can even execute).  Used by 'snifftest' in package.json.
  }
}

module.exports = {
  run
};
