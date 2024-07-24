---
title: "Meteor Up & Let’s Encrypt’s FREE SSL"
author: "Madushan Nishantha"
date: 2015-12-10T07:25:42.934Z
lastmod: 2024-07-24T20:53:22+02:00

description: ""

subtitle: ""

image: "/posts/img/2015-12-10_meteor-up-lets-encrypts-free-ssl_0.png" 
images:
 - "/posts/img/2015-12-10_meteor-up-lets-encrypts-free-ssl_0.png"


aliases:
- "/meteor-up-let-s-encrypt-based-free-ssl-d17111f69f15"

---

You’ve probably already heard the big news. Let’s Encrypt is now in [public beta](https://letsencrypt.org/2015/12/03/entering-public-beta.html), enabling the whole world to send encrypted and trustworthy traffic over the internet. SSL certificates are no longer expensive. In fact, they come at the best price in the world: **FREE**!!

![](/posts/img/2015-12-10_meteor-up-lets-encrypts-free-ssl_0.png#layoutTextWidth)

When Let’s Encrypt beta hit the news, we at Kadira were planning a surprise of our own. We’re going to bring you a brand new [Meteor Up](https://github.com/kadirahq/meteor-up) version with modular architecture with long term support. [@mnmtanish](https://medium.com/u/a071ed1ceaab) will tell you more about it in an upcoming post.

As one of Meteor Up’s new features, we thought of bundling Let’s Encrypt directly into Meteor Up itself. So you can have SSL support without worrying one little bit.

**Here’s my research on Let’s Encrypt and Meteor Up**

As Daniel Arrizza[pointed](https://forums.meteor.com/t/setting-up-ssl-with-letsencrypt-and-meteorup/14457) out at the meteor forums, you can use the following procedure to get a SSL certificate for your Meteor app(deployed with mup)

- SSH into your production Meteor app.
- Stop your app (Yeah, I know you can’t. We’ll discuss this more in a moment).
- Clone Let’s Encrypt [client repo](https://github.com/letsencrypt/letsencrypt).
- Enter to the repo and run the following command as root:

```bash
./letsencrypt-auto -d <your.domain> -email <you@email.xyz> certonly — standalone
```

- If the command is successful, you’ll have your certificates bundle at **/etc/letsencrypt/live/your.domain/**. Download those files ( fullchain.pem and privkey.pem) to your dev box.
- Edit your **mup.json** file to have these files as the SSL bundle. (You may need to do it differently in mup and mupx.)
- Do **mup setup && mup deploy**from your local machine.
- Remember to change your app’s **ROOT_URL**to https:// and add the package **force-ssl.**

### FAQ

#### Why do I need to stop my app?

In order to get a certificate, Let’s Encrypt needs to authorize that you own the domain. There are a few ways to do that. But, above **letsencrypt-auto** command does it like this.

- It starts an HTTP server in port 80. (Port 80 is a must.)
- It then requests a certificate from Let’s Encrypt Certificate Authority (CA).
- CA needs to verify the ownership of the domain.
- So, CA will send a HTTP request (to a special path) to our domain.
- Then the HTTP server started above gets that request, and then CA will identify that I’m the owner of this domain.

This is just an overview of what’s happening under the hood. Most importantly, **letsencrypt-auto** needs to start its own HTTP server on **port 80**.

#### **Can I get the certificate without stopping my app?**

In production, you **can’t** really stop your app, even for a few seconds. And this gets worse, since you need to get a new certificate at least **every three months**. That’s because the SSL certificate you get will **expire** in three months.

In order to implement the certificate acquiring process without a downtime, we need to deeply integrate it to the web server or the proxy we use.

There is a [module](https://github.com/letsencrypt/letsencrypt/tree/master/letsencrypt-apache) for Apache that renews the certificate automatically. So, you can proxy your app through Apache to avoid the downtime. We prefer **nginx** over Apache for various reasons. There is a [nginx module](https://github.com/letsencrypt/letsencrypt/tree/master/letsencrypt-nginx) that automatically renews Let’s Encrypt certificates, but it’s still experimental.

We hope it’ll get stable soon so we can use it with Meteor Up. If that doesn’t happen, we may need to try something else.

#### What if I have more than one server for the same domain?

The certificate request process needs you to put a **special** piece of information on a **publicly** accessible location on your server. That’s to verify that you really own the domain. If you are terminating SSL in front of every app servers, this could be an issue.

That’s because only one server can get a new certificate at a time. After you grab the certificate, you need to manually configure it with other app servers.

But it could be **easier**, if you could configure your **load balancer** to interact with Let’s Encrypt.

#### What if I really need to use Let’s Encrypt SSL right now?

If you can bear a**few minutes of downtime** for your app and you are willing to change your certificate manually **every three months**, of course you can.

Read [this](https://forums.meteor.com/t/setting-up-ssl-with-letsencrypt-and-meteorup/14457) Meteor Forums post.

#### Where can I learn more about Let’s Encrypt?

The Let’s Encrypt official website is the best place for that. If you specifically want to know more about the domain validation process, read these links:

- [https://letsencrypt.org/howitworks/technology](https://letsencrypt.org/howitworks/technology)
- [https://www.cryptologie.net/article/274/lets-encrypt-overview](https://www.cryptologie.net/article/274/lets-encrypt-overview)

* * *
Written on December 10, 2015 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/meteor-up-let-s-encrypt-based-free-ssl-d17111f69f15)
