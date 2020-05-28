
const log = require('../lib/log');
const { createRemoteResources, getRemoteResources, deleteRemoteResources } = require('../lib/remoteResource');
const { subscriptionClient, getSubscriptions } = require('../lib/subscriptions');

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

subscriptionClient.subscribe( (event) => {
  log.info('Received an event from razeedash-api', event);
  if(event.data && event.data.subscriptionUpdated && event.data.subscriptionUpdated.has_updates) { 
    init();
  } else {
    log.error(`Received graphql error from ${API_HOST}/graphql`, event);
  }
}, (error) => {
  log.error(`Error creating a connection to ${API_HOST}/graphql`, error);
});

const init = async() => {
  // rr's on this cluster with the 'deploy.razee.io/clustersubscription' annotation
  const clusterResources = await getRemoteResources();
  log.debug('cluster remote resources:', clusterResources);

  // // list of razee subscriptions for this org id
  const res = await getSubscriptions(RAZEE_TAGS).catch( () => false );
  const subscriptions = (res && res.data && res.data.subscriptionsByTag) ? res.data.subscriptionsByTag : false;
  log.debug('razee subscriptions:', subscriptions);

  // 
  // Create remote resources
  // 
  if(subscriptions && subscriptions.length > 0) {
    await createRemoteResources(subscriptions);
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

init();
