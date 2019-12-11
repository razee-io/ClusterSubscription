const template = `
    apiVersion: "deploy.razee.io/v1alpha1"
    kind: RemoteResource
    metadata:
      name: subscription-genned-deployables
      namespace: razee
    spec:
      requests:
        {{#urls}}
        - options:
            url: "{{&.}}"
            headers:
              razee-org-key: {{& orgKey}}
        {{/urls}}
`;

module.exports = template;
