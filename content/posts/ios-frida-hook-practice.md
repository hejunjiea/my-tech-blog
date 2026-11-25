---
slug: ios-frida-hook-practice
title: Frida Hook 实战：Interceptor、ObjC 替换与内存扫描
date: 2026-11-25
category: 逆向工程
summary: 从 attach 进程到改写参数与返回值，整理 Frida 在 iOS 上做 Hook 的四类常用手段与必须注意的细节。
---

上一篇讲的是怎么「找到」目标函数，这篇讲找到之后怎么「动手」。Frida 的能力面很宽，但日常真正高频的其实只有四个动作：拦截函数、替换方法、扫描内存、读写对象。

## 一、起步：脚本与进程

先把脚本跑起来，确认目标进程与架构：

```
frida-ps -U                 # 列出设备上的进程
frida -U -f com.example.app -l hook.js --no-pause
```

`-f` 表示冷启动并注入，`--no-pause` 让进程继续运行。脚本里第一件事建议先打版本与架构，避免在 ARM64e 上按 ARM64 的思路写代码。

## 二、Interceptor.attach：拦截函数

最通用的一招，可以挂导出符号，也可以挂任意已知地址：

```
Interceptor.attach(Module.findExportByName(null, "open"), {
  onEnter(args) {
    console.log("[open]", ptr(args[0]).readUtf8String());
  },
  onLeave(retval) {
    console.log("[open] ret =", retval.toInt32());
  }
});
```

要点：

- `args[0]` 是指针，读字符串要用 `readUtf8String()`，不是直接打印
- 想改返回值用 `retval.replace(ptr(0))`
- 目标函数被内联或地址算错时不会报错，只是永远不触发，所以先用日志确认命中

## 三、ObjC 层：替换方法实现

对 Objective-C 方法，可以用运行时接口拿到实现并替换：

```
const cls = ObjC.classes.LoginManager;
const method = cls["- isVip"];
const original = new NativeFunction(method.implementation, "bool", ["object", "pointer"]);

Interceptor.replace(method.implementation, new NativeCallback(function (self, sel) {
  const real = original(self, sel);
  console.log("[isVip]", real);
  return 1;              // 强制返回 true
}, "bool", ["pointer", "pointer"]));
```

也可以用 `Interceptor.attach` 更轻量地只观察、不改返回值。判断标准很简单：只读信息用 attach，要改行为用 replace 或改写 `onLeave` 的 retval。

## 四、内存扫描与符号查找

符号被裁剪时，扫描是最后手段：

```
// 查找导出符号，找不到返回 null
const addr = Module.findExportByName("AppBinary", "_OBJC_CLASS_$_Foo");

// 在模块内扫描一段特征字节
Memory.scan(Module.findBaseAddress("AppBinary"), 0x200000, "2D 00 00 00", {
  onMatch(address) { console.log("match at", address); },
  onComplete() { console.log("scan done"); }
});
```

扫描结果只是候选，必须回到运行时验证——打断点、看调用栈、确认参数形态，不要看到一处匹配就直接改。

## 五、容易踩的细节

- **参数类型不声明**：`NativeFunction` 的签名写错，读到的就是垃圾值，且不一定崩溃
- **指针认证**：ARM64e 上部分指针带签名，直接当普通地址用会失败
- **主线程约束**：在 Hook 里操作 UI 要切回主线程，否则表现异常
- **脚本热更新**：改脚本后用 `%reload` 重载，比反复重启进程快得多
- **异常吞掉**：Hook 走的是原生层，JS 抛错不会中断目标进程，但会让逻辑静默失效

## 六、一个可复用的调试习惯

每次写新 Hook，先按这个顺序来：

1. 只 attach 打日志，确认命中与参数形态
2. 确认调用时机与线程
3. 再改返回值或替换实现
4. 加上开关与退出逻辑，方便快速回滚

> 顺序错了会浪费大量时间：在不确认命中的情况下改行为，等于同时排除两个变量。

## 小结

Frida 的 API 不复杂，难的是判断该用哪一种：符号被导出用 attach，方法有元数据用 ObjC 接口，什么都没了才用扫描。把「先验证、再改动」的顺序固定下来，调试成本会下降一个量级。
