---
title: "The dangers of sudoedit"
author: "Madushan Nishantha"
date: 2017-02-23T14:33:48.967Z
lastmod: 2024-07-24T20:53:33+02:00

description: ""

subtitle: ""




aliases:
- "/the-dangers-of-sudoedit-c433cbdade83"

---

Giving access to execute vim or any other editor as root for a unprivileged user in a Linux system using sudo policies has been heavily frowned uponbecause then the user, if using vim can simply execute “:!shell” and quickly gain a root shell.

For this reason, my coworkers have been using sudoedit, which ultimately limits the vim commands so the user can’t do things like dropping into a root shell.

But imagine their surprise when I told them, the user, having access to something like `sudo sudoedit /etc/apache2/apache.conf`, can then simply execute `:e /etc/sudoers/` alter the the sudoers file and give themselves more privileges.

At the end, we came to the conclusion that giving user any kind of editor access under root permission is not safe.

* * *
Written on February 23, 2017 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/the-dangers-of-sudoedit-c433cbdade83)
