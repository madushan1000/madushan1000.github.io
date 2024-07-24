---
title: "Compile AOSP dialer with Gradle"
author: "Madushan Nishantha"
date: 2019-10-27T19:34:39.560Z
lastmod: 2024-07-24T20:53:43+02:00

description: ""

subtitle: ""




aliases:
- "/compile-aosp-dialer-with-gradle-27280121dd63"

---

As you might now AOSP and by inheritance, LineageOS uses makefile based build system to build system components like apps.

I wanted to play around with the AOSP/LineageOS dialer code to add some features I’d like to have in it, but unfortunately, AOSP build system doesn’t work with Android studio, and I couldn’t figure out a way to run it stand alone from the AOSP ecosystem, so I decided to write a Gradle script to do the job.

I didn’t want to modify the Dialer code to get it compiling because I think it might make it harder to merge upstream modifications to the code. So I came up with a somewhat hacky Gradle script/some other dependencies to compile it.

You can see the code here,

1. Gradle subprojects based script, it’s super long and harder to debug ([https://github.com/madushan1000/LDialer/tree/submodule-way](https://github.com/madushan1000/LDialer/tree/submodule-way))
2. A cleaner way using Gradle build flavors, still hacky ([https://github.com/madushan1000/LDialer/tree/master](https://github.com/madushan1000/LDialer/tree/master))

Both branches use git submodules so make sure you deal with them properly. Build targets api 28, but you might have to target api 27 to get the app to properly run due to some hidden apis being blocked in pie.

* * *
Written on October 27, 2019 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/compile-aosp-dialer-with-gradle-27280121dd63)
