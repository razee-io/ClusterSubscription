const Mustache = require('mustache');

const log = require('../lib/bunyan-api').createLogger('cluster-subscription');

const { KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();
const kc = new KubeClass(kubeApiConfig);

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

const API_VERSION = 'deploy.razee.io/v1alpha2';
const KIND = 'RemoteResource';
const NAMESPACE = process.env.NAMESPACE;

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
  subscriptionUpdated(org_id: "${ORG_ID}", tags: "${RAZEE_TAGS}") {
    has_updates
  }
}
`;

const subscriptionClient = createSubscriptionObservable(
  `${API_HOST}/graphql`, 
  SUBSCRIBE_QUERY
);

subscriptionClient.subscribe(eventData => {
  console.log('Received event: ');
  console.log(JSON.stringify(eventData, null, 2));
  // Call function to get all subscriptions
  getSubscriptions();
  // create the remote resources
}, (err) => {
  console.log('Err');
  console.log(err);
});

const getSubscriptions = () => {
  console.log('Fetching new subscriptions....');

  const client = new ApolloClient({
    link: createHttpLink({
      uri: `${API_HOST}/graphql`,
      fetch: fetch,
      headers: {
        'razee-org-key': ORG_KEY
      }
    }),
    cache: new InMemoryCache()
  });

  const requestsTemplate = `{
  "options": {
    "url": "{{{url}}}",
    "headers": {
      "razee-org-key": "{{orgKey}}"
    }
  }
}`;

  client.query({
    query: gql`
    query SubscriptionsByTags {
      subscriptionsByTag(org_id: "${ORG_ID}", tags: "test") {
        subscription_name
        subscription_channel
        subscription_uuid
        subscription_version
        url
      }
    }
  `,
  })
    .then(async results => {
      let subscriptions = [];
      const krm = await kc.getKubeResourceMeta(API_VERSION, KIND, 'update');
      console.log(krm);
      if(results.data && results.data.subscriptionsByTag) {
        subscriptions = results.data.subscriptionsByTag;
        subscriptions.map( async sub => {
          console.log(sub.subscription_name + ' - ' + sub.subscription_uuid);

          let url = `${API_HOST}/${sub.url}`;
          let rendered = Mustache.render(requestsTemplate, { url: url, orgKey: ORG_KEY });
          let parsed = JSON.parse(rendered);
          const resourceName = `clustersubscription-${sub.subscription_name}`;
          const resourceTemplate = {
            'apiVersion': API_VERSION,
            'kind': KIND,
            'metadata': {
              'namespace': NAMESPACE,
              'name': resourceName,
              'labels': {
                'razee/watch-resource': 'lite'
              }
            },
            'spec': {
              'requests': []
            }
          };
          resourceTemplate.spec.requests.push(parsed);
          console.log(resourceTemplate);

          const opt = { simple: false, resolveWithFullResponse: true };

          const uri = krm.uri({ name: resourceName, namespace: NAMESPACE });
          const get = await krm.get(resourceName, NAMESPACE, opt);
          if (get.statusCode === 200) {
          // the remote resource already exists so use mergePatch to apply the resource
            log.info(`Attempting mergePatch for an existing resource ${uri}`);
            const mergeResult = await krm.mergePatch(resourceName, NAMESPACE, resourceTemplate, opt);
            if (mergeResult.statusCode === 200) {
              log.info('mergePatch successful', mergeResult.statusCode, mergeResult.statusMessage, mergeResult.body);
            } else {
              log.error('mergePatch error', mergeResult.statusCode, mergeResult.statusMessage, mergeResult.body);
            }
          } else if (get.statusCode === 404) {
          // the remote resource does not exist so use post to apply the resource
            log.info(`Attempting post for a new resource ${uri}`);
            const postResult = await krm.post(resourceTemplate, opt);
            if (postResult.statusCode === 200 || postResult.statusCode === 201) {
              log.info('post successful', postResult.statusCode, postResult.statusMessage, postResult.body);
            } else {
              log.error('post error', postResult.statusCode, postResult.statusMessage, postResult.body);
            }
          } else {
            log.error(`Get ${get.statusCode} ${uri}`);
          }

        });
      }
          
    })
    .catch(error => console.error(error));

};
