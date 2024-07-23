---
title: Gcc Link Time Function Wrapping
date: 2024-06-23 09:00:00
tags:
- Gcc
- linker
categories:
- tinkering
keywords:
- Gcc
- linker
---
GCC has an interesting flag we can use to switch out an implementation of a function at link time, called "wrap". 
I think this is usually used for testing functions with unpredictable inputs. But we can use this to add a reverse-engineered implementation and redirect all references in the object code to our implementation.
If we want to replace
```c
void some_func() {}
```
We must name our implementation `__wrap_some_func()`. So we have to add `__wrap_` to the beginning of the function name.
```c
void __wrap_some_func() {
  //some code
}
```

Then we have to ask the linker to link our implementation.

```shell
gcc -Wl,-wrap,some_func -o someprogram main.c reversed_functions.c -lsomelib -L../path-to-somelib
```
Or in a Makefile
```makefile
WRAP_FUNCTIONS := some_func some_func2
LDFLAGS += $(foreach var, $(WRAP_FUNCTIONS), -Wl,-wrap,$(var))
```

Sometimes the compiler decides not to globally export some symbols, if we reference these symbols in our reverse-engineered code, Linker will complain about missing symbols.
If these symbols are still in the static library, we can export them globally manually. 

Find out if the symbol is present,
```shell
nm libsomelib.a | grep some_symbol
```
then export it,
```shell
mv libsomelib.a libsomelib.orig.a
objcopy libsomelib.orig.a --globalize-symbol=some_symbol libsomelib.a
```
