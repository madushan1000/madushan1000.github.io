---
title: "Testing Meteor Up — It’s Harder Than We Thought"
author: "Madushan Nishantha"
date: 2015-12-30T15:09:38.244Z
lastmod: 2024-07-24T20:53:28+02:00

description: ""

subtitle: ""

image: "/posts/img/2015-12-30_testing-meteor-up-its-harder-than-we-thought_0.png" 
images:
 - "/posts/img/2015-12-30_testing-meteor-up-its-harder-than-we-thought_0.png"


aliases:
- "/testing-meteor-up-it-s-harder-than-we-thought-945ad0f1f4a"

---

As you may already [know](https://voice.kadira.io/meteor-up-let-s-encrypt-based-free-ssl-d17111f69f15), we here at [Kadira](https://kadira.io) are busy building a modular version of [Meteor Up](https://github.com/kadirahq/meteor-up/). We are planning to release it in February 2016. It’s based on [mupx](https://github.com/arunoda/meteor-up/tree/mupx) with some fixes for common issues. Most importantly, we will be able to get new features and bug fixes very quickly.

> Have a look at the [source code](https://github.com/kadirahq/meteor-up) and the [roadmap](https://waffle.io/kadirahq/meteor-up).

In the [previous](https://github.com/arunoda/meteor-up/tree/mupx) version of Meteor Up, there were no unit or integration tests. Actually, [Arunoda](https://medium.com/u/233a53961f2f) has to check for all the situations manually. That’s a major barrier to accepting new PRs. We could get around this with a proper test setup, but building an automated test setup for Meteor Up is very hard, because you need to work with real servers.

#### Test setup for Meteor Up 1.0

For Meteor Up 1.0, we are using a combination of [Mocha](https://mochajs.org/) and [shelljs](https://github.com/shelljs/shelljs) to write integration tests. Shelljs invokes the Meteor Up binary just like any other command-line tool and checks the output for certain conditions.

Instead of mocking, we decided to **actually deploy** a Meteor app on a real server when testing Meteor Up. Our initial thoughts were to spawn small aws/gcloud vm instances on the fly per test and destroy them afterwards. But we realized this approach might make it hard for other people to contribute to if they don’t have access to our selected cloud provider. So to make things a little easier, we thought of using a Docker-in-Docker approach.

#### Docker-in-Docker

To test Meteor Up, we need a server with SSH access. In this approach, we launch a separate Docker container for each of our test cases and run the test selecting that Docker instance as the server.

Interestingly, Meteor Up also uses Docker inside the server. Actually, it installs Docker inside the server. Then it uses [MeteorD](https://github.com/meteorhacks/meteord) to run Meteor apps.

> **This is a case of Docker-in-Docker.**

![](/posts/img/2015-12-30_testing-meteor-up-its-harder-than-we-thought_0.png#layoutTextWidth)

There are a few things we need to consider when creating a Docker-in-Docker setup. Some of them are listed in [this post](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/).

Other than these, the most important things we noticed are:

- You should change the Docker storage driver from [Aufs](https://docs.docker.com/engine/userguide/storagedriver/aufs-driver/) (the default) to [devicemapper](https://docs.docker.com/engine/userguide/storagedriver/device-mapper-driver/) since Aufs does not support nested mount points.
- You should run your outer Docker container with the `- privileged=true` flag to allow it to access host resources like devices (which is required to run a Docker daemon).

#### Running tests in parallel

Mocha runs tests in series. There is no option to run tests concurrently even if you have the resources. But since each of our tests uses its own Docker container, we can speed up the testing if we can run them in parallel, if we have test boxes with enough CPU and RAM.

Most of the tests were already written in Mocha so it was hard to switch to another test runner that supports parallel testing. So we decide to write a custom [shell script](https://github.com/kadirahq/meteor-up/blob/master/tests/test-run.sh) which uses [GNU Parallel](http://www.gnu.org/software/parallel/) to run tests in parallel.

Basically it sets up the Docker instances as servers for each test, and then runs the Mocha binary with the `-g` (grep) flag to select just one test per Docker instance from the whole test suite.

Then it uses GNU Parallel to schedule tests and manage parallelism. GNU Parallel can schedule a given number of processes to a limited number of CPU cores easily.

#### Continuous integration

We tried several CI providers, but none of them supported privileged Docker containers, for obvious reasons. In the future, we are hoping to set up our own CI server like Jenkins to run tests automatically on pull requests, but for right now, all the tests have to be run **manually by running a single shell script**.

Have a look at Meteor Up’s [contribution guide](https://github.com/kadirahq/meteor-up/blob/master/CONTRIBUTING.md) for more information.

We are getting so close to releasing Meteor Up 1.0. 
Have a look at the [roadmap](https://waffle.io/kadirahq/meteor-up), since we would really like your help.

> Follow [KADIRA VOICE](https://voice.kadira.io/) to receive updates on Meteor Up.

* * *
Written on December 30, 2015 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/testing-meteor-up-it-s-harder-than-we-thought-945ad0f1f4a)
