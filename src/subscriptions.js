const log = require('../lib/bunyan-api').createLogger('cluster-subscription');
const { execute } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ApolloClient = require('apollo-boost').ApolloClient;
const fetch = require('cross-fetch/polyfill').fetch;
const createHttpLink = require('apollo-link-http').createHttpLink;
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache;
const ws = require('ws');
const gql = require('graphql-tag');

const ORG_ID = process.env.RAZEE_ORG_ID;
const ORG_KEY = process.env.RAZEE_ORG_KEY;
const RAZEE_API = process.env.RAZEE_API;

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

const getWsClient = function(wsurl) {
  const client = new SubscriptionClient(
    wsurl, {
      reconnect: true,
      'connectionParams': {
        headers: {
          'razee-org-key': ORG_KEY
        }
      }
    }, ws
  );
  return client;
};

const createSubscriptionObservable = (wsurl, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl));
  return execute(link, {query: query, variables: variables});
};

const SUBSCRIBE_QUERY = gql`
subscription WatchForUpdates {
  subscriptionUpdated(org_id: "${ORG_ID}") {
    has_updates
  }
}
`;

const subscriptionClient = createSubscriptionObservable(`${API_HOST}/graphql`, SUBSCRIBE_QUERY);

const queryClient = new ApolloClient({
  link: createHttpLink({
    uri: `${API_HOST}/graphql`,
    fetch: fetch,
    headers: {
      'razee-org-key': ORG_KEY
    }
  }),
  cache: new InMemoryCache()
});


const getSubscriptions = async (razeeTags) => {
  log.info('Fetching subscriptions');
  try {
    return queryClient.query({
      query: gql`
        query SubscriptionsByTags {
          subscriptionsByTag(org_id: "${ORG_ID}", tags: "${razeeTags}") {
            subscription_name
            subscription_uuid
            url
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
  } catch (error) {
    log.error(error);
  }
};

exports.getSubscriptions = getSubscriptions;
exports.subscriptionClient = subscriptionClient;
