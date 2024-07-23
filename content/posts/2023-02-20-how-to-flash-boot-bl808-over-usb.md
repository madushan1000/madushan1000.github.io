---
title: How to flash/boot bl808 over USB
date: 2023-02-20 09:00:00
tags:
- bl808
- ox64
- uboot
- usb
categories:
- tinkering
keywords:
- bl808
- ox64
- uboot
- usb
---
# Compile/Install U-boot
Get riscv-32 musl toolchain. Get u-boot tree with usb support and compile it.

```bash
#toolchain
wget https://musl.cc/riscv32-linux-musl-cross.tgz
tar xf riscv32-linux-musl-cross.tgz
export PATH=$PWD/riscv32-linux-musl-cross/bin:$PATH

#u-boot
git clone https://github.com/madushan1000/u-boot -b bl808/usb-udc
cd u-boot

#compile
make CROSS_COMPILE=riscv32-linux-musl- ox64_m0_defconfig
make CROSS_COMPILE=riscv32-linux-musl-
```

Put bl808 into flash mode and flash u-boot(this is only needed the first time until we have u-boot on the board)

```bash
#install the flash tool
pip3 install bflb-mcu-tool

#flash u-boot, replace /dev/ttyACM0 with your uart port
bflb-mcu-tool --chipname bl808 --port /dev/ttyACM0 --baudrate 115200 --firmware uboot.bin
```

Reset the board, now there should be a usb device that shows up as a fastboot device.

```bash
❯ fastboot devices
????????????	Android Fastboot
```

# Fastboot/UUU
Board will power up and listen as a fastboot device forever by default. We can run fastboot commands to configure the board.

```bash
❯ fastboot getvar version
version: 0.4
Finished. Total time: 0.000s

❯ fastboot oem run:'ls mmc 0'
OKAY [  0.445s]
Finished. Total time: 0.445s
```

But the fastboot protocol implimented by u-boot is not fully compatible with android fastboot, so we need to use uuu(https://github.com/nxp-imx/mfgtools)

```text
# install uuu
$ sudo apt install uuu
$ uuu -s
# uuu console
U>CFG: FB: -vid 0x18d1 -pid 0x4e40
>Start Cmd:CFG: FB: -vid 0x18d1 -pid 0x4e40
Okay
U>FB: reboot
>Start Cmd:FB: reboot
New USB Device Attached at 3:9
3:9>Okay (0s)
Okay
U>
```
we can also use uuu scripts

```tcl {title=reboot.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: reboot
FB: Done
```

then run,

```text
$ uuu -V -b reboot.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: reboot
3:9>Okay (0.001s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)
```

# Boot D0 over usb
Get the D0 u-boot firmware from here (https://github.com/openbouffalo/u-boot/releases/tag/bl808-2023-02-19)
```tcl {title=boot-d0.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: getvar version
FB: ucmd setenv fastboot_buffer 0x51000100
FB: download -f fw_payload-bl808-2023-02-19.elf
FB: ucmd rproc init 0 || true
FB: ucmd rproc load 0 51000100 1000000
FB: ucmd rproc start 0
FB: Done
```
then run,

```text
$ wget https://github.com/openbouffalo/u-boot/releases/download/bl808-2023-02-19/fw_payload-bl808-2023-02-19.elf
$ uuu -V -b boot-d0.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: getvar version
0.43:9>Okay (0.001s)
3:9>Start Cmd:FB: ucmd setenv fastboot_buffer 0x51000000
3:9>Okay (0s)
3:9>Start Cmd:FB: download -f fw_payload-bl808-2023-02-19.elf
3:9>Okay (0.175s)
3:9>Start Cmd:FB: ucmd rproc init 0 || true
3:9>Okay (0.024s)
3:9>Start Cmd:FB: ucmd rproc load 0 51000000 1000000
3:9>Okay (0.044s)
3:9>Start Cmd:FB: ucmd rproc start 0
3:9>Okay (0s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)
```

# Flash to SDcard
We can flash stuff to sdcard using uuu. For flashing the sdcard, it has to be patitioned. Then we can create a raw partition image and flash it over USB. 

If the first parition of the sdcard is 200Mb.
```tcl {title=flash-sdcard.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: flash -raw2sparse 0 disk.raw
FB: Done
```
then, 
```text
$ truncate -s $((200*1024*1024)) disk.raw
$ mkfs.ext4 disk.raw
$ mkdir mnt
$ mount disk.raw mnt
$ echo 'test' > mnt/test
$ umount mnt
$ uuu -V -b flash-sdcard.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: flash -raw2sparse 0 disk.raw
100%3:9>Okay (43.77s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)
```

# Flash to internal flash

Flashing to internal flash is also possible, be careful not to overwrite u-boot.

```tcl {title=flash-internal-flash.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: getvar version
FB: download -f bl_mcu_sdk/examples/helloworld/build/build_out/helloworld_bl808_m0.bin
FB: ucmd sf probe
FB[-t 60000]: ucmd sf update 0x51000000 0x300000 0x100000
FB: reboot
FB: Done%
```
then run,

```text
$ uuu -V -b flash-internal-flash.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: getvar version
0.43:9>Okay (0s)
3:9>Start Cmd:FB: download -f bl_mcu_sdk/examples/helloworld/build/build_out/helloworld_bl808_m0.bin
3:9>Okay (0.007s)
3:9>Start Cmd:FB: ucmd sf probe
3:9>Okay (0.008s)
3:9>Start Cmd:FB[-t 60000]: ucmd sf update 0x51000000 0x300000 0x100000
3:9>Okay (9.664s)
3:9>Start Cmd:FB: reboot
3:9>Okay (0s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)

```

# Boot the above flashed firmware
It's possible for u-boot to boot the above flashed firmware using some magic to map `0x300000` as XIP start address

```tcl {title=boot-firmware.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: getvar version
#FB: ucmd setenv fastboot_buffer 0x51000000
FB: ucmd mw 0x2000b0A0 0x300000
FB: ucmd dcache flush
FB: acmd go 0x58000000
FB: Done
```
then run,

```text
$ uuu -V -b boot-firmware.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: getvar version
0.43:9>Okay (0s)
3:9>Start Cmd:FB: ucmd mw 0x2000b0A0 0x300000
3:9>Okay (0s)
3:9>Start Cmd:FB: ucmd dcache flush
3:9>Okay (0.001s)
3:9>Start Cmd:FB: acmd go 0x58000000
3:9>Okay (0s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)
```

# Update U-boot
We can also update u-boot to a newer verison over usb. To do that, we need to generate a proper bootheader for u-boot using `bflb-mcu-tool`

```text
bflb-mcu-tool --chipname bl808 --build --firmware uboot.bin
```

the completed image will end up on `bflb-mcu-tool` python package directory(ex: `~/.local/lib/python3.10/site-packages/bflb_mcu_tool/chips/bl808/img_create_mcu/whole_img.bin`) copy it to the working dir and,
```tcl {title=update-u-boot.lst}
CFG: FB:  -vid 0x18d1 -pid 0x4e40
FB: getvar version
FB: download -f whole_img.bin
FB: ucmd sf probe
FB[-t 60000]: ucmd sf update 0x51000000 0 0x100000
FB: reboot
FB: Done
```
then run,

```text
$ uuu -V -b update-u-boot.lst
Wait for Known USB Device Appear...
>Start Cmd:CFG: FB:  -vid 0x18d1 -pid 0x4e40
>Okay (0s)
New USB Device Attached at 3:9
3:9>Start Cmd:FB: getvar version
0.43:9>Okay (0s)
3:9>Start Cmd:FB: download -f whole_img.bin
3:9>Okay (0.032s)
3:9>Start Cmd:FB: ucmd sf probe
3:9>Okay (0.007s)
3:9>Start Cmd:FB[-t 60000]: ucmd sf update 0x51000000 0 0x100000
3:9>Okay (7.227s)
3:9>Start Cmd:FB: reboot
3:9>Okay (0s)
3:9>Start Cmd:FB: Done
3:9>Okay (0s)
```

If u-boot update goes wrong, we will have to flash u-boot again using the bl808 flash mode.
