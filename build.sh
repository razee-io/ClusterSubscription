#!/bin/bash

eval $(minikube docker-env)

echo "Building docker image"
docker build -t cs:latest . 

echo "Deleting old pod"
kubectl get pods -n razee | grep clustersubscription | awk '{print $1}' | xargs kubectl delete pod

echo "Tailing new pod"
kubectl get pods -n razee | grep clustersubscription | awk '{print $1}' | xargs kubectl logs -f 
