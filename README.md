# ClusterSubscription

Subscribe to Razee controlled resources

## Install

- Logon to your RazeeDash server and go to the manage org page
  - ie. `https://app.razee.io/stark-industries/org`
- Install ClusterSubscription in your cluster using the
`Install Razee Agent` command on the org page.
  - ie. `kubectl apply -f "https://app.razee.io/api/install/razeedeploy-job?orgKey=orgApiKey-..."`
- Verify that a `razee-identity` ConfigMap and Secret have been created on your cluster
- Logon to your RazeeDash server and go to the `Deployables` page to create
Cluster Groups, Channels and Subscriptions

## Environment Variables
<!--Markdownlint-disable MD034-->
<!--Markdownlint-disable MD013-->
| Name | Required | Description |
| ---- | -------- | ------------- |
| RAZEE_API           | yes | The url to your razeedash-api. ex: http://api-host:8081  Found in the `razee-identidy` ConfigMap|
| RAZEE_ORG_KEY       | yes | The orgApiKey used to communicate with razeedash-api. ex: orgApiKey-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeer . Found in the `razee-identity` Secret|
| CLUSTER_ID          | yes | The razee defined cluster id.  Found in the `razee-identity` ConfigMap|

### Upgrading to 3.0

- If you are upgrading existing clusters to the 3.0+ release of ClusterSubscription then you will need to create
a `razee-identity` ConfigMap and Secret manually.  
  - Logon to your RazeeDash server and go to the clusters page
    - ie. `https://app.razee.io/stark-industries/clusters`
  - Click a cluster name and go to the Details tab
  - From there you will see the kubectl commands you can run to generate the `razee-identity` ConfigMap and Secret
  - Now you can add this cluster to a Cluster Group from the Deployables page
