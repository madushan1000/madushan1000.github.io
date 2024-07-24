---
title: "Create a kubernetes user for CD"
author: "Madushan Nishantha"
date: 2018-03-16T03:41:35.152Z
lastmod: 2024-07-24T20:53:37+02:00

description: ""

subtitle: ""




aliases:
- "/create-a-kubernetes-user-for-cd-c022b19590cb"

---

Say you wanted to set up continuous deployment pipeline with kubernetes at the end of it. So github hosts your code, aws codepipeline build and deploy it on a kubernetes cluster you set up with [kops](https://github.com/kubernetes/kops).

You can set all this up manually or existing cloudformation templates pretty easily(look [here](https://github.com/aws-samples/aws-kube-codesuite), and [here](https://github.com/keithsharp/kubernetes-cloudformation)). But the first cloudformation template linked, asks for certificate the kubernetes CA, user certificate/private key. I could have provided the admin keypair and set it up easily. But being paranoid as I am, I didn’t want to give the build system the total access to the system. Also the template is complicating a lot of stuff using the lambda functions. So I stripped away the lambda functions part and decided to do it on the codebuild step using `kubectl`(why kubectl? Because I’m lazy, hate me!)

So I enabled [RBAC](https://kubernetes.io/docs/admin/authorization/rbac/) for the cluster and started looking at ways to set up a new user who can run `kubectl`. The [documentation](https://kubernetes.io/docs/admin/authentication/) on this was surprisingly lacking in this area. I could found one on how to set up a `service-account`[here](https://github.com/kubernetes/dashboard/wiki/Creating-sample-user), but I didn’t want to use tokens. I also found how to setup a normal user using tokens [here](https://pracucci.com/kubernetes-rbac-with-kops.html) and [here](https://github.com/kubernetes/kops/issues/2354), but it looked like I have to reboot the master every time I have to add a user, plus, I still didn’t like tokens. But found nothing on how to add a user with certificate authentication(maybe I’m just bad at googling stuff :/)

Frustrated, I decided to go rogue on kubernetes documentation on how to add TLS trusts to the cluster, it looked close enough to what I was trying to do. I did some small modifications here and there but the steps as follows.Keep in mind that I setup the cluster using kops and enabled RBAC beforehand.

- Download and install [cfssl](https://blog.cloudflare.com/introducing-cfssl/).
- Generate a csr, change everything in <> to your values(certificate sign request)

```json
$ cat <<EOF | cfssl genkey - | cfssljson -bare server
{
  "hosts": [
    "<k8s.dev.myhost.com>",
    "<api.k8s.dev.myhost.com>",
    "<ip of myhost api>"
  ],
  "CN": "test-user",
  "key": {
    "algo": "ecdsa",
    "size": 256
  }
}
EOF
```

- send the CSR to your kubernetes cluster(I’m not sure if the `server auth` section is required here. But `client auth` is required. My certificate didn’t work without it.

```yaml
$ cat <<EOF | kubectl create -f -
apiVersion: certificates.k8s.io/v1beta1
kind: CertificateSigningRequest
metadata:
  name: test-user
spec:
  groups:
  - system:authenticated
  request: $(cat server.csr | base64 | tr -d '\n\r')
  usages:
  - digital signature
  - key encipherment
  - server auth
  - client auth
EOF
```

- approve the csr `kubectl certificate approve test-user`
- download the certificate

```bash
kubectl get csr test-user -o jsonpath=’{.status.certificate}’ | base64 -d > server.crt
```

- Fill out the following kubeconf (this won’t work with kubernetes-dashboard since it only supports token authentication). sections end with `-data` should be filled out with base64 encoded content of the certificate string. use this command `cat something.crt | base64 -e | tr -'\n\r'` . Omit `\r` if you’re on linux. Or you can omit `-data` from the section name and give the path to your certificate file.

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: <ca cert64>
    server: https://api.dev.myserver.com
  name: mysererver
contexts:
- context:
    cluster: myserver
    namespace: default
    user: test-user
  name: mycontext
current-context: "mycontext"
kind: Config
preferences: {}
users:
- name: test-user
  user:
    client-certificate-data: <client cert b64>
    client-key-data: <client private key b64>
```

- now this config file should work with kubectl use this command to verify.

```bash
$ kubectl --kubeconf=./config get pods
Error from server (Forbidden): pods is forbidden: User "test-user" cannot list pods in the namespace "default"
```

- Don’t forget to assign proper roles to the user if you have enabled RBAC. take a look at kubernetes RBAC guide on how to do that.

* * *
Written on March 16, 2018 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/create-a-kubernetes-user-for-cd-c022b19590cb)
