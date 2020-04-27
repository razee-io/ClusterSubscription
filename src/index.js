const log = require('../lib/bunyan-api').createLogger('cluster-subscription');

const { createRemoteResources, getRemoteResources, deleteRemoteResources } = require('./remoteResource');
const { subscriptionClient, getSubscriptions} = require('./subscriptions');

const ORG_ID = process.env.RAZEE_ORG_ID;
const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;
const RAZEE_TAGS = process.env.RAZEE_TAGS;

if (!ORG_ID) {
  throw 'Please specify process.env.RAZEE_ORG_ID';
}
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
  const clusterResources = await getRemoteResources();
  // TODO: get a set of labels/tags from razeedash-api for this org_id instead of using RAZEE_TAGS
  //       const res = await getTags();
  const razeeResults = await getSubscriptions(RAZEE_TAGS);

  let subscriptions = [];
  if(razeeResults.data && razeeResults.data.subscriptionsByTag) {
    subscriptions = razeeResults.data.subscriptionsByTag;
    await createRemoteResources(subscriptions);
  }

  const subscriptionUuids = subscriptions.map( (sub) => sub.subscription_uuid );
  const invalidResources = clusterResources.filter( (rr) => {
    return subscriptionUuids.includes(rr.metadata.annotations['deploy.razee.io/clustersubscription']) ? false : true;
  });
 
  const invalidSelfLinks = invalidResources.map( (resource) => resource.metadata.selfLink );
  if(invalidSelfLinks.length > 0) {
    await deleteRemoteResources(invalidSelfLinks);
  }
};

init();
