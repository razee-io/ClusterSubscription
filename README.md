# ClusterSubscription

Subscribe to razee controlled resources

## Environment Variables
<!--Markdownlint-disable MD034-->
<!--Markdownlint-disable MD013-->
| Name | Required | Description |
| ---- | -------- | ------------- |
| RAZEE_API           | yes | The url to your razeedash-api. ex: http://api-host:8081|
| RAZEE_ORG_KEY       | yes | The orgApiKey used to communicate with razeedash-api. ex: orgApiKey-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeer |
| RAZEE_TAGS          | yes | One or more subscription tags which were defined in Razeedash  |

These variables should be set in a config map called 'clustersubscription'

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
 name: clustersubscription
data:
 RAZEE_ORG_KEY: "orgApiKey-...."
 RAZEE_TAGS: "tags"
 RAZEE_API: "http://api-host:8081"
```
