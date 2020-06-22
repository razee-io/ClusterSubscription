
const log = require('../lib/log');
const { createRemoteResources, getRemoteResources, deleteRemoteResources } = require('../lib/remoteResource');
const { getClusterConfig } = require('../lib/cluster');
const { webSocketClient } = require('../lib/websocket');
const { getSubscriptionsByCluster } = require('../lib/queries');

const razeeListener = async (razeeApi, apiKey, clusterId) => {
  const wsClient = webSocketClient(razeeApi, apiKey);
  wsClient.subscribe( (event) => {
    log.info('Received an event from razeedash-api', event);
    if(event.data && event.data.subscriptionUpdated && event.data.subscriptionUpdated.has_updates) { 
      callRazee(razeeApi, apiKey, clusterId);
    } else {
      log.error(`Received graphql error from ${razeeApi}/graphql`, {'error': event});
    }
  }, (error) => {
    log.error(`Error creating a connection to ${razeeApi}/graphql`, {error});
  });
};

const callRazee = async(razeeApi, apiKey, clusterId) => {

  // rr's on this cluster with the 'deploy.razee.io/clustersubscription' annotation
  const clusterResources = await getRemoteResources();
  log.debug('remote resources on this cluster:', {clusterResources});

  // list of razee subscriptions for this cluster
  const res = await getSubscriptionsByCluster(razeeApi, apiKey, clusterId).catch( () => false );
  const subscriptions = (res && res.data && res.data.subscriptionsByCluster) ? res.data.subscriptionsByCluster : false;
  log.debug('razee subscriptions', {subscriptions});

  // 
  // Create remote resources
  // 
  if(subscriptions && subscriptions.length > 0) {
    await createRemoteResources(razeeApi, apiKey, subscriptions);
    log.info('finished creating remote resources');
  }

  // 
  // Delete remote resources
  // 
  if(subscriptions && clusterResources && clusterResources.length > 0) {
    log.info('looking for remote resources to delete...');
    
    const subscriptionUuids = subscriptions.map( (sub) => sub.subscription_uuid ); // uuids from razee
    const invalidResources = clusterResources.filter( (rr) => {
      // the annotation looks like: deploy.razee.io/clustersubscription: 89cd2717-c7f5-43d6-91a7-fd1ec44e1abb
      return subscriptionUuids.includes(rr.metadata.annotations['deploy.razee.io/clustersubscription']) ? false : true;
    });
 
    const invalidSelfLinks = invalidResources.map( (resource) => resource.metadata.selfLink );
    if(invalidSelfLinks.length > 0) {
      await deleteRemoteResources(invalidSelfLinks);
    } else {
      log.debug('existing remote resources are valid. nothing to delete');
    }
  } 
};

(async function() {
  const config = await getClusterConfig().catch( (error) => console.error(error) );
  const { razeeApi, apiKey, clusterId } = config;
  log.debug({razeeApi, clusterId});
  if(razeeApi && apiKey && clusterId) {
    razeeListener(razeeApi, apiKey, clusterId); // create a websocket connection to razee
    callRazee(razeeApi, apiKey, clusterId); // query razee for updated subscriptions
  } else {
    console.error('RAZEE_API, CLUSTER_ID and RAZEE_ORG_KEY must be supplied in a razee-cd configmap and secret');
  }

})().catch((error) => console.error(error));
