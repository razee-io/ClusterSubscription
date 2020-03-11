# ClusterSubscription

Subscribe to Razee controlled resources

## Install

- Logon to your RazeeDash server and go to the manage org page.
ie. `https://app.razee.io/stark-industries/org`
- Install RazeeDeploy and ClusterSubscription in your cluster using the
`Install Razee Agent` command on the org page.
    - ie. `kubectl apply -f "https://app.razee.io/api/install/razeedeploy-job?orgKey=orgApiKey-..."`
- Edit the `clustersubscription` config map on your cluster(s) to add the
RAZEE_TAGS that you want.
    - `kubectl edit cm clustersubscription`
    - `RAZEE_TAGS: 'comma,separated,tags,go,here'`
- Logon to your RazeeDash server and go to the `Deployables` page to create
channels and subscriptions

## Environment Variables
<!--Markdownlint-disable MD034-->
<!--Markdownlint-disable MD013-->
| Name | Required | Description |
| ---- | -------- | ------------- |
| RAZEE_API           | yes | The url to your razeedash-api. ex: http://api-host:8081|
| RAZEE_ORG_KEY       | yes | The orgApiKey used to communicate with razeedash-api. ex: orgApiKey-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeer . You can find this value from your org page on RazeeDash. ex: https://your-razeedash/your-orgname/org|
| RAZEE_TAGS          | yes | One or more comma-separated subscription tags which were defined in Razeedash  |

These variables should be set in a ConfigMap and Secret called `clustersubscription`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clustersubscription
data:
  RAZEE_API: "http://api-host:8081"
  RAZEE_TAGS: "tag1, tag2"
---
apiVersion: v1
kind: Secret
metadata:
 name: clustersubscription
data:
 RAZEE_ORG_KEY: "orgApiKey-...."
```

Updates to the ConfigMap require a restart of your `clustersubscription` pod
