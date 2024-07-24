---
title: "Chrome “run in mpv” without nativeagent on win10"
author: "Madushan Nishantha"
date: 2019-03-12T05:42:43.673Z
lastmod: 2024-07-24T20:53:41+02:00

description: ""

subtitle: ""




aliases:
- "/chrome-run-in-mpv-without-nativeagent-on-win10-c5ec113287d3"

---

First, install mpv and set these options in **mpv.conf**. (this is usually in **C:\Users\<username>\AppData\Roaming\mpv\mpv.conf**)

```ini
ontop
border=no

#sets the player window to the bottom left cornor of the screen
geometry=100%:93%
autofit=384x216

#youtube-dl config, setting the video size to 480p or less
ytdl-format=bestvideo[height<=?480]+bestaudio/best[height<=?480]
```

I need to run mpv in a single instance mode, so it would replace the video in the current window instead of a new one when I click on a new link. Download and put [**umpvw.exe**](https://github.com/SilverEzhik/umpvw) at the same directory as **mpv.exe**.

Create this powershell script somewhere to trigger umpvw when some link comes in. (my path is **C:\ProgramData\chocolatey\bin\mpv.ps1**)

```powershell
Add-Type -AssemblyName System.Web
$innaurl = $args[0]
$eurl = $innaurl -replace "^.*url="
$url = [System.Web.HttpUtility]::UrlDecode($eurl)
$arguments = @()
$arguments += $url
Start-Process -FilePath C:\ProgramData\chocolatey\lib\mpv.install\tools\umpvw.exe -ArgumentList $arguments
```

Then register **mpv.ps1** as the default app for **iina://**protocol(iina because I use iina on Macos and I couldn’t think of some better name). Save this to a .reg file and double click on it.

```registry
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\iina]
@="URL:iina"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\iina\shell]

[HKEY_CLASSES_ROOT\iina\shell\open]

[HKEY_CLASSES_ROOT\iina\shell\open\command]
@="powershell.exe -windowstyle hidden -File C:\\ProgramData\\chocolatey\\bin\\mpv.ps1 %1"
```

Then in your browser, add the following code as a bookmarklet(create a new bookmark and paste it as the url). This code will delete all the other url params if it encounters a “list” param. Because mpv has some issue handling playlists if there’s a “v” param too.

```javascript
javascript:(function() {
 var baseURL = 'iina://open?url=';
 var url = window.location.href;
 var urlo = new URL(url);
 if (urlo.searchParams.get('list') != null) {
  urlo.searchParams.forEach((_, key) => {
   if (key != 'list') { urlo.searchParams.delete(key);}
   console.log(key)
  });
 }
 url = urlo.toString();
    var link = document.createElement('a');
    link.href=`${baseURL}${url}`;
    document.body.appendChild(link);
    link.click();
})();
```

Now, add this to the bookmark bar, and when you click on it, there will be a popup asking it you want to open a link in powershell, click yes and the video will start in mpv.

* * *
Written on March 12, 2019 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/chrome-run-in-mpv-without-nativeagent-on-win10-c5ec113287d3)
