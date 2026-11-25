---
slug: ios-swift-hook
title: Swift 场景下的 Hook：为什么 %hook 会失效
date: 2026-11-25
category: 逆向工程
summary: Swift 默认静态派发，大量方法根本不进 Objective-C 运行时。本文解释原因，并给出 final 方法、内部符号与 @objc dynamic 三类场景的处理思路。
---

很多人第一次 Hook Swift 写的 App 时会困惑：明明方法就在那里，`%hook` 却毫无反应。这不是写法问题，而是 Swift 的派发机制决定的——大量方法压根不经过 ObjC 的消息转发。

## 一、Swift 的四种派发方式

- **静态派发**：编译期就确定调用地址，最常见，性能最好
- **虚表派发**：类方法默认走 vtable，地址在运行时确定，但不经过 `objc_msgSend`
- **消息派发**：标了 `dynamic` 或用 `@objc` 暴露给 ObjC 的方法
- **协议见证表**：面向协议实现的多态

只有第三类能被方法交换拦到。判断依据很简单：能在 `ObjC.classes` 里看到这个类和方法，才说明它暴露给了运行时。

## 二、判断能不能用 %hook

先用 Frida 查一下：

```
const cls = ObjC.classes.YourTargetClass;
if (!cls) { console.log("类未暴露给 ObjC 运行时"); }
else { console.log(cls.$ownMethods); }
```

如果类是 Swift 原生类、没有继承 `NSObject`，或者方法没有标 `@objc`，那么 `%hook`、`Interceptor.replace(method.implementation)` 都会失效。

## 三、final 与静态方法怎么处理

`final`、`static`、`struct` 的方法无法被子类覆盖，也不进 vtable 的动态替换点。可行的路子只有两条：

1. **按符号名定位地址，做指令级 Hook**：用 `nm`、`Module.enumerateSymbols` 找到 mangled 符号，拿到地址后 attach
2. **改调用点**：在真正的调用方做拦截，绕过目标方法本身

```
Module.enumerateSymbols("AppBinary").forEach(sym => {
  if (sym.name.indexOf("LoginManager") !== -1) console.log(sym.name, sym.address);
});
```

Swift 符号名经过 name mangling，形如 `$s6MyApp12LoginManagerC5checkyyF`，按类名子串过滤比按完整名匹配更实用。

## 四、@objc dynamic 是例外

给方法加上 `dynamic` 后，Swift 会改用消息派发，同时若加上 `@objc` 就会注册到运行时。这类方法可以正常用方法交换，也可以在 `ObjC.classes` 里找到。

一个常被忽略的细节：KVO、Selector 调用、`respondsToSelector:` 这些场景本身要求方法暴露给 ObjC，所以凡是被这些机制用到的 Swift 方法，往往都能 Hook。

## 五、实操顺序

1. 先确认目标类是否在 `ObjC.classes` 中
2. 在 `$ownMethods` 里找目标方法；有 → 用方法交换或 `Interceptor.replace`
3. 找不到 → 用 `enumerateSymbols` 按类名过滤找 mangled 符号
4. 拿到地址 → `Interceptor.attach` 观察，确认命中后再改行为
5. 都没有 → 退到调用方做拦截，或改走静态分析定位

> 顺序的本质是：从「有元数据」往「只有机器码」逐级下沉，能停在前一步就不要往下走。

## 六、常见误解

- **「Swift 不能 Hook」**：不对，是「不暴露给 ObjC 的部分不能靠方法交换 Hook」
- **「加了 @objc 就行」**：还需 `dynamic` 才会走消息派发，否则可能仍被静态优化
- **「符号名对不上就是没有」**：先确认是 Release 包符号被裁剪，还是过滤条件写错

## 小结

Swift 让 Hook 变难的根源，是派发方式从「运行时查表」变成了「编译期确定」。理解这一点之后，剩下的事就是判断目标处于哪一层，然后选择对应的手段——而不是反复怀疑框架没生效。
