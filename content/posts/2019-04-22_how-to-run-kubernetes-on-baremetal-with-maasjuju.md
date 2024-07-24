---
title: "How to run kubernetes on bare-metal with maas/juju"
author: "Madushan Nishantha"
date: 2019-04-22T12:04:54.426Z
lastmod: 2024-07-24T20:53:41+02:00

description: ""

subtitle: ""

image: "/posts/img/2019-04-22_how-to-run-kubernetes-on-baremetal-with-maasjuju_0.png" 
images:
 - "/posts/img/2019-04-22_how-to-run-kubernetes-on-baremetal-with-maasjuju_0.png"


aliases:
- "/how-to-run-kubernetes-on-bare-metal-with-maas-juju-d5ba8e981710"

---

I started experimenting with kubernetes on bare-metal about a month back and I’m documenting some of the details here.

My network layout is essentially flat(one dedicated vlan for everything k8s) and I wanted to run any low demanding controller software on VMware ESXi. So I had the k8s dedicated vlan added to ESXI hosts and a vSwitch managing the vlan for me on ESXi side. Also, I had 3 physical servers(HP G10) added to the same network. I made sure that my network has no dhcp-helpers or other dhcp servers in the network running. And we have no firewall rules restricting traffic inside the same vlan.

The plan is to run the maas and juju controllers on ESXi, two k8s masters on bare metal(which will also be running workloads) and one dedicated worker node on bare metal.

Creating the MAAS controller is easy, just create a VM with modest resources(4GB/2core) and install Ubuntu 18.04 LTS. And then install MAAS and initialize the admin user.

```bash
 sudo add-apt-repository ppa:maas/stable
 sudo apt update
 sudo apt install maas
 sudo maas init <you'll be asked to provide admin user info>
```

Then we can visit MAAS web ui at http://<your.maas.ip>:5240/MAAS/ and login with the admin user we created. Import an ssh key for the admin user and confirm the sources, and then we can get to the home page.

After that, we need to configure the networks MAAS should manage, the VM I’m using had two vnics, one for accessing the UI trough and the other inside the k8s vlan. Both were automatically identified by MAAS. In the subnets section in the MAAS ui, we can see there are two fabrics, one with our public nic and the other with our k8s vlan nic.

![](/posts/img/2019-04-22_how-to-run-kubernetes-on-baremetal-with-maasjuju_0.png#layoutTextWidth)

By clicking on the “untagged” label(despite they all being named untagged, they’re referring to multiple vlans) of the proper fabric, we can get to the subnet settings. By scrolling down and clicking “Reserve range”, I added an IP range MAAS can’t put machines in. And by clicking “Reserve dynamic range”, I added an IP range where MAAS can offer DHCP IP’s from(there shouldn’t be any other machines in this range). Now, we can enable DHCP for the vlan by scrolling up and clicking “Take action” -> “provide DHCP”.

Now to discover our physical machines in MAAS, we have to set the servers to netboot using PXE, and then boot them once. MAAS will provide dhcp IP’s for the machines and netboot them, and add a new user to machine control panel(HP iLO in our case) trough IPMI(supports other protocols too, see documentation). Make sure iLO or whatever the management software has remote IPMI port enabled, so MAAS can log in and boot the machine when required.

At this point, we have three machines showing up in our MAAS ui. They have randomly generated names assigned. Edit the names and assign them to the proper DNS zone(usually DNS something.maas, you can add additional DNS zones by going to DNS section). And make sure we have authoritative DNS record added with your MAAS management machines hostname, otherwise, we’ll face weird issues where machines being provisioned trying to reach our public interface.

Now, we can start enlisting machines by going to “machines” section, clicking on the machine we need to enlist and clicking on “Take action” -> “Enlist”. If the remote IPMI connection is working properly, MAAS will boot the machine and install a dummy Ubuntu OS on it. And MAAS will also set the default boot options so that the machine will properly boot next time.

After all three are enlisted, we are ready to install juju.

Running juju requires us to deploy a juju controller, as far as I can see, this can be deployed on lxc to but I didn’t want to bother finding out. So what I did was I created a VM on ESXi and put it in the k8s vlan. When I booted it, it got discovered by maas, I enlisted it as the same and I did for physical machines. But after this, the machine memory showed up as 0bytes(it was 4Gb actually). So I logged into MAAS db and set it to the proper value. Also, we tag this machine as **juju** in MAAS machines section.

```bash
 sudo -u maas psql -d maasdb
 maasdb=>update maasserver_node set memory=4096 where memory=0;
```

Now install juju

```bash
 sudo add-apt-repository ppa:juju/stable
 sudo apt update
 sudo apt install juju
```

Add maas cloud to juju by running

```bash
 >juju add-cloud
 Select cloud type: maas
 Enter a name for your maas cloud: maas-cloud
 Enter the API endpoint url: <MAAS url from above, looks like http://10.55.60.29:5240/MAAS>

 >juju add-credential maas-cloud
 Enter credential name: maas-cloud-creds
 Using auth-type "oauth1".
 Enter maas-oauth: <token is under "MAAS Keys" in user setting page in MAAS ui>
```

Now, bootstrap juju controller in the VM we just discovered by running bellow. It should run for a couple of minutes and provision the juju controller in our VM.

```bash
 juju bootstrap --constraints tags=juju <maas-cloud name form above> <arbitary controller name>
ex:
 juju bootstrap --constraints tags=juju maas-cloud juju-controller
```

After that’s finished, if you have a 5 physical node enlisted, you can run below to deploy a production-grade cluster with HA.

```bash
 juju deploy canonical-kubernetes
```

But this is sort of a waste of resources because it’s using a machine each to deploy easyrsa and api load balancer. So I’m going to change it a bit by editing the bundle.yaml. Before that, we’re tagging the three machines we have in MAAS. All three have “k8s” tag, and two has “master” tag, the other one has “worker” tag.

The modified bundle.yaml is bellow, it’ll run easyrsa/a master on node-0, api load balancer/a master on node-1, k8s worker in node-2(technically on all three because we want to run workloads on the masters too), and etcd in all three nodes, And it’ll also move the api loadbalancer to port 8443 from the usual 443 because it conflicts when we try to run k8s worker.

```yaml
series: bionic
description: A highly-available, production-grade Kubernetes cluster.
machines:
  '0':
    constraints: tags=k8s,master
  '1':
    constraints: tags=k8s,master
  '2':
    constraints: tags=k8s,worker
services:
  easyrsa:
    annotations:
      gui-x: '450'
      gui-y: '550'
    charm: cs:~containers/easyrsa-231
    num_units: 1
    resources:
      easyrsa: 5
    to:
      - '1'
  etcd:
    annotations:
      gui-x: '800'
      gui-y: '550'
    charm: cs:~containers/etcd-411
    num_units: 3
    options:
      channel: 3.2/stable
    resources:
      etcd: 3
      snapshot: 0
    to:
      - '0'
      - '1'
      - '2'
  flannel:
    annotations:
      gui-x: '450'
      gui-y: '750'
    charm: cs:~containers/flannel-398
    resources:
      flannel-amd64: 108
      flannel-arm64: 108
      flannel-s390x: 94
  kubeapi-load-balancer:
    annotations:
      gui-x: '450'
      gui-y: '250'
    charm: cs:~containers/kubeapi-load-balancer-617
    options:
      port: 8443
    expose: true
    num_units: 1
    resources: {}
    to:
      - '0'
  kubernetes-master:
    annotations:
      gui-x: '800'
      gui-y: '850'
    charm: cs:~containers/kubernetes-master-642
    num_units: 2
    options:
      channel: 1.14/stable
    resources:
      cdk-addons: 0
      kube-apiserver: 0
      kube-controller-manager: 0
      kube-proxy: 0
      kube-scheduler: 0
      kubectl: 0
    to:
      - '0'
      - '1'
  kubernetes-worker:
    annotations:
      gui-x: '100'
      gui-y: '850'
    charm: cs:~containers/kubernetes-worker-508
    expose: true
    num_units: 3
    options:
      channel: 1.14/stable
    resources:
      cni-amd64: 118
      cni-arm64: 110
      cni-s390x: 115
      kube-proxy: 0
      kubectl: 0
      kubelet: 0
    to:
      - '0'
      - '1'
      - '2'
relations:
- - kubernetes-master:kube-api-endpoint
  - kubeapi-load-balancer:apiserver
- - kubernetes-master:loadbalancer
  - kubeapi-load-balancer:loadbalancer
- - kubernetes-master:kube-control
  - kubernetes-worker:kube-control
- - kubernetes-master:certificates
  - easyrsa:client
- - etcd:certificates
  - easyrsa:client
- - kubernetes-master:etcd
  - etcd:db
- - kubernetes-worker:certificates
  - easyrsa:client
- - kubernetes-worker:kube-api-endpoint
  - kubeapi-load-balancer:website
- - kubeapi-load-balancer:certificates
  - easyrsa:client
- - flannel:etcd
  - etcd:db
- - flannel:cni
  - kubernetes-master:cni
- - flannel:cni
  - kubernetes-worker:cni

```

Save this to a file and deploy with

```bash 
 juju deploy ./bundle.yaml
```

We can monitor the progress by running

```bash
 watch -c juju status --color
```

After everything is in active/idle state, copy the kubecfg file.

```bash
 juju scp kubernetes-master/0:config ~/.kube/config
```

And now we can do normal kubernetes stuff.

* * *
Written on April 22, 2019 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/how-to-run-kubernetes-on-bare-metal-with-maas-juju-d5ba8e981710)
