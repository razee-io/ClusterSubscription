const assert = require('chai').assert;
const rewire = require('rewire');
const rr_rewired = rewire('../lib/remoteResource');
let applied = [];

describe('#ClusterSubscriptionTests', async function() {
  before(function() {
    rr_rewired.__set__('NAMESPACE', 'default');
    rr_rewired.__set__('applyResource', applyResourceMock);
  });

  afterEach(function() {
    applied = [];
  });

  const applyResourceMock = function(resourceJson) {
    applied.push(resourceJson);
  };

  const razeeApi = 'testRazeeApi';
  const apiKey = 'testApiKey';
  const clusterId = 'testClusterId';

  const sub = {
    subscriptionName: 'testSubName',
    subscriptionUuid: 'testSubUuid',
    url: 'api/v1/channels/testConfigName/uuid',
    kubeOwnerName: null,
    remote: null
  };
  const subRemote = {
    subscriptionName: 'testSubNameRemote',
    subscriptionUuid: 'testSubRemoteUuid',
    url: null,
    kubeOwnerName: null,
    remote: {
      remoteType: 'github',
      parameters: [ 
        { key: 'repo', value: 'https://github.com/razee-io/ClusterSubscription.git' },
        { key: 'ref', value: 'master' },
        { key: 'filePath', value: '*.yaml' },
        { key: 'secretname', value: 'razee-git' },
        { key: 'authentication', value: 'true' }
      ],

    }
  };

  const subRemoteNoAuth = {
    subscriptionName: 'testSubNameRemoteNoAuth',
    subscriptionUuid: 'testSubRemoteNoAuthUuid',
    url: null,
    kubeOwnerName: null,
    remote: {
      remoteType: 'github',
      parameters: [ 
        { key: 'repo', value: 'https://github.com/razee-io/ClusterSubscription.git' },
        { key: 'ref', value: 'master' },
        { key: 'filePath', value: '*.yaml' },
        { key: 'authentication', value: 'false' }
      ],
    }
  };

  const rr = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'generic',
      requests: [ {
        options: {
          url: 'testRazeeApi/api/v1/channels/testConfigName/uuid',
          headers: { 'razee-org-key': { valueFrom: { secretKeyRef: {
            name: 'clustersubscription-testSubUuid-secret',
            namespace: 'default',
            key: 'razee-api-org-key'
          } } } }
        }
      } ]
    }
  };

  const secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubUuid-secret',
      annotations: {
        'deploy.razee.io/clustersubscription-secret': 'testSubUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    data: { 'razee-api-org-key': 'dGVzdEFwaUtleQ==' }
  };
  const rrGit = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubRemoteUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubRemoteUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'git',
      requests: [ {
        options: {
          git: {
            provider: 'github',
            repo: 'https://github.com/razee-io/ClusterSubscription.git',
            ref: 'master',
            filePath: '*.yaml'
          },
          headers: { Authorization: { valueFrom: {
            secretKeyRef: { name: 'razee-git', namespace: 'default', key: 'token' }
          }} }
        }
      } ]
    }
  };

  const rrGitNoAuth = {
    apiVersion: 'deploy.razee.io/v1alpha2',
    kind: 'RemoteResource',
    metadata: {
      namespace: 'default',
      name: 'clustersubscription-testSubRemoteNoAuthUuid',
      annotations: {
        'deploy.razee.io/clustersubscription': 'testSubRemoteNoAuthUuid',
        'deploy.razee.io/clusterid': 'testClusterId'
      },
      labels: { 'razee/watch-resource': 'lite' }
    },
    spec: {
      clusterAuth: { impersonateUser: 'razeedeploy' },
      backendService: 'git',
      requests: [ {
        options: {
          git: {
            provider: 'github',
            repo: 'https://github.com/razee-io/ClusterSubscription.git',
            ref: 'master',
            filePath: '*.yaml'
          }
        }
      } ]
    }
  };

  it('Create remote resource', async function() {
    // with a generic subscription, should create a generic rr with razee-org-key secret
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [sub], clusterId);
    assert.deepEqual(applied[0], secret);
    assert.deepEqual(applied[1], rr);
  });

  it('Create git remote resource', async function() {
    // for remote subscription with auth, should create git rr with provided parmeters and include Authorization header
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRemote], clusterId);
    assert.deepEqual(applied[1], rrGit);
  });

  it('Create git remote resource without auth', async function() {
    // for remote subscription without auth, should create git rr with provided parmeters and not include Authorization header
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [subRemoteNoAuth], clusterId);
    assert.deepEqual(applied[1], rrGitNoAuth);
  });

  it('Multiple subs', async function() {
    // should be able to handle multiple subscriptions and create the correct rr based on subscription type
    await rr_rewired.createRemoteResources(razeeApi, apiKey, [sub, subRemote, subRemoteNoAuth], clusterId);
    assert.deepEqual(applied[0], secret);
    assert.deepEqual(applied[3], rr);
    assert.deepEqual(applied[4], rrGit);
    assert.deepEqual(applied[5], rrGitNoAuth);
  });
});
