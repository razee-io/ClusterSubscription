const { execute } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ws = require('ws');
const gql = require('graphql-tag');
const log = require('./log');

const getWsClient = function(wsurl, apiKey) {
  log.debug(`creating websock client to ${wsurl}`);
  const client = new SubscriptionClient(
    wsurl, {
      reconnect: true,
      connectionCallback: () => { log.info(`websocket connection established with ${wsurl}`); },
      'connectionParams': {
        headers: {
          'razee-org-key': apiKey
        }
      },
    }, ws
  );
  return client;
};

const createSubscriptionObservable = (wsurl, apiKey, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl, apiKey));
  return execute(link, {query: query, variables: variables});
};

const SUBSCRIBE_QUERY = gql`
subscription WatchForUpdates {
  subscriptionUpdated {
    has_updates
  }
}
`;

const webSocketClient = (razeeApi, apiKey) => {
  return createSubscriptionObservable(`${razeeApi}/graphql`, apiKey, SUBSCRIBE_QUERY);
};

exports.webSocketClient = webSocketClient;
