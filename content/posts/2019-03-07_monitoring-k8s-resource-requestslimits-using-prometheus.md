---
title: "Monitoring k8s resource requests/limits using prometheus"
author: "Madushan Nishantha"
date: 2019-03-07T15:55:29.052Z
lastmod: 2024-07-24T20:53:38+02:00

description: ""

subtitle: ""

image: "/posts/img/2019-03-07_monitoring-k8s-resource-requestslimits-using-prometheus_0.png" 
images:
 - "/posts/img/2019-03-07_monitoring-k8s-resource-requestslimits-using-prometheus_0.png"
 - "/posts/img/2019-03-07_monitoring-k8s-resource-requestslimits-using-prometheus_1.png"


aliases:
- "/monitoring-k8s-resource-requests-limits-using-prometheus-88496b2c882c"

---

I wanted to keep track of pod resource requests/limits using prometheus and grafana for one of the clusters I admin.

There are a couple of grafana dashboards designed for this (ex:[https://grafana.com/dashboards/7187](https://grafana.com/dashboards/7187)) and even the official kubernetes app for grafana has some useful dashboards. But I opted for using the dashboard I linked above because I wanted the stats in the whole cluster perspective.

But the problem was, the dashboard doesn’t filter pods by its state(Running, Completed, etc..) and my cluster has an app that create a lot of one time pods. The dashboard count all the dead pods in it’s resource requests/limits aggregation and it adds up to a gigantic number.

![](/posts/img/2019-03-07_monitoring-k8s-resource-requestslimits-using-prometheus_0.png#layoutTextWidth)

So I had to modify the dashboard a bit to get the true(active) values for the cluster. The trick is to combine **kube_pod_status_phase** metricand **kube_pod_container_resource_requests_cpu_cores**metric(or **kube_pod_container_resource_limits_cpu_cores**, **kube_pod_container_resource_requests_memory_bytes**, **kube_pod_container_resource_limits_memory_bytes**) to get the resource requests/limits of the running pods only.

I’m not very familiar with the prometheus query language so I had to google quite a lot to find out a similar [example](https://utcc.utoronto.ca/~cks/space/blog/sysadmin/PrometheusGroupLeftHack). After reading the blog post, I came up with something like,

```promql
 kube_pod_container_resource_requests_cpu_cores == on(pod, namespace) group_left() (kube_pod_status_phase{phase="Running"}==1)
```

but this didn’t work!, it returned empty dataset. After trying a couple of more configurations, I decided to go on the prometheus IRC chat and ask there. As **SuperQ** on the prometheus IRC very helpfully explained, the **==**operator compared the numerical values of the metics, it doesn’t magically merge the metric entries even if we use **group_left.**According to **SuperQ’s**suggestion, I changed my query to,

```promql
 kube_pod_container_resource_requests_cpu_cores and on(pod, namespace)(kube_pod_status_phase{phase="Running"}==1)
```

And it started working. the only disadvantage is that we can’t use **group_by** to merge the two metric entries with binary operators like **and**(but if you need to merge, you can use something like **/on(pod, namespace) group_by(<labels>)(kube_pod_status_phase{phase=”Running”}==1)**) I didn’t see a lot of helpful articles or examples on something like this besides the prometheus docs so I decided to write it down. Here is a screenshot of my new dashboard.

![](/posts/img/2019-03-07_monitoring-k8s-resource-requestslimits-using-prometheus_1.png#layoutTextWidth)

And the dashboard json.

{{< gist madushan1000 be7a901095f4195b292e36bbfde656ed >}}

* * *
Written on March 7, 2019 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/monitoring-k8s-resource-requests-limits-using-prometheus-88496b2c882c)
