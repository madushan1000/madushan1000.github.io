---
title: "Run ChromeOS Flex in QEMU"
author: "Madushan Nishantha"
date: 2022-10-04T19:18:00.431Z
lastmod: 2024-07-24T20:53:43+02:00

description: ""

subtitle: ""




aliases:
- "/run-chromeos-flex-in-qemu-3eca7912349d"

---

First we need to find the chromeos flex recovery image. We can find a link to it here,

> [https://dl.google.com/dl/edgedl/chromeos/recovery/cloudready_recovery.json](https://dl.google.com/dl/edgedl/chromeos/recovery/cloudready_recovery.json)

At the time, the image is here,

> [https://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_14989.86.0_reven_recovery_stable-channel_mp-v2.bin.zip](https://dl.google.com/dl/edgedl/chromeos/recovery/chromeos_14989.86.0_reven_recovery_stable-channel_mp-v2.bin.zip)

Download it and unzip. Then create a disk image to install chromeos.

```bash
 truncate -s 20G disk.img
```

Then run qemu with both images attached, makes sure the recovery image is hda.

```text
 qemu-system-x86_64 -enable-kvm -m 4G -smp 4 -machine q35 -cpu host -device virtio-vga-gl -rtc base=utc -hda chromeos_14989.86.0_reven_recovery_stable-channel_mp-v2.bin -hdb disk.img -display gtk,gl=on,show-cursor=on -usb -device usb-tablet

```
The important sections are `-device virtio-vga-gl` and `-display **,gl=on,` which attaches a [hardware accelerated graphics device](https://wiki.archlinux.org/title/QEMU#virtio) using **virgl** and then use that for displaying stuff. Without this Chromeos will try to cpu render graphics and it will be supper laggy.

`-usb -device usb-tablet` is there because Chromeos doesn’t seem to play nice with the qemu mouse device. usb-tablet works okay, but we don’t get scrolling

Follow the on screen instructions to install Chromeos into disk.img. After it’s done, shout down the VM, stop qemu and then run this to start using ChromeOS from disk.img.
```text
 qemu-system-x86_64 -enable-kvm -m 4G -smp 4 -machine q35 -cpu host -device virtio-vga-gl -rtc base=utc -display gtk,gl=on,show-cursor=on -usb -device usb-tablet -hda disk.img
```

These commands worked for me on ubuntu 22.04.01 LTS and let me use Chromeos on guest mode. I didn’t try to log in.

I found some of the info from this Japanese blog [https://blog.oyasu.info/2022/05/02/8439/](https://blog.oyasu.info/2022/05/02/8439/)

* * *
Written on October 4, 2022 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/run-chromeos-flex-in-qemu-3eca7912349d)
