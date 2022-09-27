const { ApolloLink } = require('apollo-link');
const ApolloClient = require('apollo-boost').ApolloClient;
const fetch = require('cross-fetch/polyfill').fetch;
const createHttpLink = require('apollo-link-http').createHttpLink;
const { onError } = require('apollo-link-error');
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache;
const gql = require('graphql-tag');
const log = require('./log');

const createQueryClient = (razeeApi, apiKey) => {

  const httpLink = createHttpLink({
    uri: `${razeeApi}/graphql`,
    fetch: fetch,
    headers: {
      'razee-org-key': apiKey
    }
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
      graphQLErrors.map(({ message, extensions }) => {
        log.error(`[GraphQL error]: Message: ${message}, Type: ${extensions.code}`);
      });
    if (networkError) {
      log.error(`[Network error]: ${networkError}`);
    }
  });

  const queryClient = new ApolloClient({
    link: ApolloLink.from ([ errorLink, httpLink ]),
    cache: new InMemoryCache(),
  });

  return queryClient;

};

const getSubscriptionsByCluster = async (razeeApi, apiKey, clusterId) => {

  const queryClient = createQueryClient(razeeApi, apiKey);

  log.info('Fetching subscriptions by cluster id', {clusterId});
  try {
    return queryClient.query({
      query: gql`
        query SubscriptionsByClusterId {
            subscriptionsByClusterId(clusterId: "${clusterId}") {
            subscriptionName
            subscriptionUuid
            url
            kubeOwnerName
            remote { 
              remoteType
              parameters { key value }
            }
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
  } catch (error) {
    log.error(error);
  }
};

exports.getSubscriptionsByCluster = getSubscriptionsByCluster;
