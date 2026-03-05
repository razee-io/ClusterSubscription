# ClusterSubscription

Subscribe to Razee controlled resources

> **⚠️ DEPRECATION NOTICE**
>
> This project is deprecated and is no longer actively maintained.
> The razee.io components are no longer being developed or supported.
>
> ## Alternatives
>
> **For IBM Cloud users:**
>
> - [IBM Cloud Continuous Delivery](https://www.ibm.com/products/continuous-delivery)
>
> **For open source users:**
>
> - [Argo CD](https://argo-cd.readthedocs.io/en/stable/)
> - [Flux CD](https://fluxcd.io/)
> - [Tekton](https://tekton.dev/)

## Building from Source

If you need to build the container images yourself, follow these instructions:

### Prerequisites

- Docker or Podman installed
- Access to a container registry (Docker Hub, Quay.io, etc.)

### Build Instructions

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd ClusterSubscription
   ```

2. Build the container image:

   ```bash
   docker build -t <your-registry>/clustersubscription:<tag> .
   ```

3. Push the image to your registry:

   ```bash
   docker push <your-registry>/clustersubscription:<tag>
   ```

4. Update your Kubernetes manifests to use your custom image.

## Install

- Logon to your RazeeDash server and go to the manage org page
  - ie. `https://app.razee.io/stark-industries/org`
- Install ClusterSubscription in your cluster using the
`Install Razee Agent` command on the org page.
  - ie. `kubectl apply -f "https://app.razee.io/api/install/razeedeploy-job?orgKey=orgApiKey-..."`
- Verify that a `razee-identity` ConfigMap and Secret have been created on your
cluster
- Logon to your RazeeDash server and go to the `Deployables` page to create
Cluster Groups, Channels and Subscriptions

## Environment Variables
<!--Markdownlint-disable MD034-->
<!--Markdownlint-disable MD013-->
<!--Markdownlint-disable MD060-->
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
