# ClusterSubscription

Subscribe to Razee controlled resources

## Install

1. Create the `clustersubscription` config map on your cluster(s)

  ```shell
  kubectl create cm clustersubscription \
  --from-literal=RAZEE_API=${RAZEE_API} \
  --from-literal=RAZEE_ORG_KEY=${RAZEE_ORG_KEY} \
  --from-literal=RAZEE_TAGS='comma-separated-tags-go-here'
  ```

2. Install RazeeDeploy in your cluster (this will also install the ClusterSubscription agent)

```shell
kubectl apply -f https://github.com/razee-io/RazeeDeploy-delta/releases/latest/download/resource.yaml
```

3. Logon to your RazeeDash server and go to the `Deployables` page to create channels and subscriptions

## Environment Variables
<!--Markdownlint-disable MD034-->
<!--Markdownlint-disable MD013-->
| Name | Required | Description |
| ---- | -------- | ------------- |
| RAZEE_API           | yes | The url to your razeedash-api. ex: http://api-host:8081|
| RAZEE_ORG_KEY       | yes | The orgApiKey used to communicate with razeedash-api. ex: orgApiKey-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeer . You can find this value from your org page on RazeeDash. ex: https://your-razeedash/your-orgname/org|
| RAZEE_TAGS          | yes | One or more comma-separated subscription tags which were defined in Razeedash  |

These variables should be set in a config map called `clustersubscription`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
 name: clustersubscription
data:
 RAZEE_API: "http://api-host:8081"
 RAZEE_ORG_KEY: "orgApiKey-...."
 RAZEE_TAGS: "tag1, tag2"
```

Updates to the ConfigMap require a restart of your `clustersubscription` pod
