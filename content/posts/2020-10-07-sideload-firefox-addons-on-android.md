---
title: Sideload firefox addons on android
date:  2020-10-07 09:00:00
tags:
- android
- firefox
categories:
- tinkering
keywords:
- android
- firefox
---
* Install the extension you want in desktop firefox, copy the path the extension(.xpi) file you want to install and copy the content relevent to the extension from `exetensions.json`(in firefox profile dir)
* Change all the paths in that section to android paths(usually `/data/data/org.mozilla.fenix/files/mozilla/<random string>.profile/extensions/<extension id>.xpi`)
* Edit the `extensions.json` in the android profile directory and include the section you modified above in `addons` array.
* Copy the xpi file to `/data/data/org.mozilla.fenix/files/mozilla/<random string>.profile/extensions/<extension id>.xpi`
* Enable adb debugging, enable remote debugging via usb on firefox android
* Goto `about:debugging` on desktop firefox and connect to firefox on android, then select `Main Process -> inspect` and get the console
* In the console run the following code, make sure to replace the relevent sections with correct paths, and keep a tab loaded with a webpage in fenix

```javascript
Cu.import('resource://gre/modules/addons/XPIInstall.jsm')
Cu.import('resource://gre/modules/addons/XPIProvider.jsm')
Cu.import('resource://gre/modules/addons/XPIDatabase.jsm')

var nsIFile = Components.Constructor( "@mozilla.org/file/local;1", "nsIFile", "initWithPath" );
var xpiFile = new nsIFile('<full path to xpi>');

var addon = await XPIInstall.loadManifestFromFile(xpiFile, XPIInternal.XPIStates.getLocation('app-profile'));
addon.appDisabled = false;
XPIInstall._activateAddon(addon)
```

* This will install and activate the addon, to make sure it's preserved accross restarts, kill fenix right after the above step and start it again.
