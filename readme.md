### goldenDict-browser-helper

一个浏览器调用goldenDict或goldenDict-ng的脚本。

虽然本来划词的扩展已经很多了，但感觉还是不如本地多样可定制的mdx词典强大，如果系统装有umi-ocr的话也可以调用，如下图所示。

原理么就是调用goldenDict的快捷键，和umi-ocr的快捷键，不过因为浏览器本身没法是没法直接调用的，就算是装了油猴脚本（扩展不知道），所以用到了go的robotgo库实现，所以除了装了脚本后还得在终端运行go的程序，其实也就是个httpserver,脚本会调用其接口。

ps1: 还加了个用浏览器tts发音，不过不算太好用，不知道为啥句子长了中间就会断掉。

ps2: 这个go的程序还只有在前台执行，~~没法弄成开机自启动使用~~（windows可以），估计涉及到操作系统相关底层的一些问题吧。

ps3: 其实还可以弄些其它骚操作，反正其实就是调些 [快捷键](https://github.com/go-vgo/robotgo/blob/master/docs/keys.md)
而已，就看个人想象了。。。。

#### 查词

![dict](example/dict.webp)

#### ocr

得先装umi-ocr,在截图ocr设置中勾选 *复制结果* 并取消勾选 *弹出主窗口*

![ocr](example/ocr.webp)

#### 附 windows 后台运行（开机启动）

在**goldenDictHelperServer.exe**目录下创建一个后缀为.vbs的文本文件，添加以下代码

```shell
CreateObject("WScript.Shell").Run "goldenDictHelperServer.exe",0
```

保存退出编辑后，此时双击此文件即可后台运行。

若要开机自启动，鼠标右键上面创建的.vbs文件，创建快捷方式，再**windows+r**输入**shell:startup**回车后会打开一个文件夹，将快捷方式拖入这个文件夹即可。

没想到windows居然可以后台运行，不晓得linux要怎么操作哟。。。。。