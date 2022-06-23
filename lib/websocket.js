const { execute } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ws = require('ws');
const gql = require('graphql-tag');
const log = require('./log');
const Config = require('../src/Config');

const createConnectionParams = function () {
  return {
    headers: {
      'razee-org-key': Config.orgKey
    }
  };
}

const getWsClient = function (wsurl) {
  log.debug(`creating websock client to ${wsurl}`);
  const client = new SubscriptionClient(
    wsurl,
    {
      reconnect: true,
      connectionCallback: () => { log.info(`websocket connection established with ${wsurl}`); },
      connectionParams: createConnectionParams
    },
    ws
  );
  return client;
};

const createSubscriptionObservable = (wsurl, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl));
  return execute(link, { query: query, variables: variables });
};

const SUBSCRIBE_QUERY = gql`
subscription WatchForUpdates {
  subscriptionUpdated {
    hasUpdates
  }
}
`;

const webSocketClient = (razeeApi) => {
  return createSubscriptionObservable(`${razeeApi}/graphql`, SUBSCRIBE_QUERY);
};

exports.webSocketClient = webSocketClient;
