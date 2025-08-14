---
title: Reverse Engineering Jieli SDK
date: 2025-08-14 09:00:00
tags:
- llvm
- jieli
categories:
- tinkering
keywords:
- llvm
- bitcode
- re
---
# Jieli
There is an interesting series of chips from a Chinese company called Jieli, used in a lot of cheap Bluetooth headsets on AliExpress. If you want to know more about these chips, go checkout [Jieli website](https://www.zh-jieli.com/) and some [documentation on GitHub](https://github.com/kagaimiq/jielie) done by third parties.

I wanted to make a bluetooth headphone as a hobby project and came across these chips, eventually I found the SDK for these chips is published on github by the company itself(https://github.com/Jieli-Tech/fw-AC63_BT_SDK). But unfortunatly even the most basic functionality like uart or even clock initialization code, comes as precompiled static libraries in this sdk.

So I got curious and wanted to see if I can reverse engineer some of this functionality. There has already been a few attempts([#1](https://github.com/kagaimiq/jl-msbm), [#2](https://github.com/tpunix/AC632Nuke)) at this. But things are made difficult by the fact that these chips use a set of custom ISAs. There is a [Ghidra processor module](https://github.com/kagaimiq/ghidra-jieli) made for these architectures. But for the chip I have(`AC6965A` with `pi32v2`) architecture, the Ghidra module has limited support and can't disassemble a lot of instructions, so the decompilation is incomplete and most functions are unrecoverable.

While poking at the SDK, I noticed that the static library files provided by the SDK don't contain real object code, but rather LLVM bitcode. I think this is because Jieli wants to ship a single library for multiple related ISAs and re-target them at compile time for the exact architecture for the chip. 

There are a few tools out there to decompile llvm bitcode files back to C code. Let's take a look at two of them.

# LLVM-CBE
[llvm-cbe](https://github.com/JuliaHubOSS/llvm-cbe) or "LLVM C backend" is not a real decompiler but rather a compiler backend for LLVM. It takes LLVM bitcode and produces C code as the output. The output is not bad, but it's riddled with GOTOs, LLVM IR internal details like phi nodes, and other missing things that can be extracted from debug metadata like struct field names and pointer types. 

You'll have to compile llvm-cbe from sources, then find the `cpu.a` for your chip, then extract it somewhere, you can use `7z` or `ar` to extract these archives.

Then,
```shell
 ❯ llvm-cbe uart.c.o -o uart.c
```
Some example code from the output
```C
struct l_struct_struct_OC_uart_platform_data {
  void* field0;
  uint8_t field1;
  uint8_t field2;
  uint8_t field3;
  uint32_t field4;
  ...
}

static uint32_t uart_is_idle(uint32_t llvm_cbe_ut_num) {
  uint32_t _36;
  ...
  uint32_t llvm_cbe_retval_2e_0;
  uint32_t llvm_cbe_retval_2e_0__PHI_TEMPORARY;

  switch (llvm_cbe_ut_num) {
  default:
    llvm_cbe_retval_2e_0__PHI_TEMPORARY = -1;   /* for PHI node */
    goto llvm_cbe_return;
  case 0u:
    goto llvm_cbe_sw_2e_bb;
  ...
  }

llvm_cbe_sw_2e_bb:
  _36 = *(volatile uint32_t*)((void*)(uintptr_t)1974272);
  _37 = (_36 & 1) ^ 1;
  llvm_cbe_retval_2e_0__PHI_TEMPORARY = _37;   /* for PHI node */
  goto llvm_cbe_return;
  ...
}
```

# Rellic
As the Rellic [GitHub repo](https://github.com/lifting-bits/rellic) mentions, it takes LLVM bitcode and produces goto free C code as the output. It's similar to CBE, but it produces much nicer and readable code. Download it from the release section of the Rellic GitHub repo. 

When I tried to use it, it didn't like the bitcode file,
```shell
 ❯ rellic-decomp --input uart.c.o --output uart.rellic.c
error: unknown target triple 'pi32v2', please use -triple or -arch
*** Aborted at 1754750491 (unix time) try "date -d @1754750491" if you are using GNU date ***
PC: @                0x0 (unknown)
*** SIGSEGV (@0x50) received by PID 2197801 (TID 0x71cbb455be80) from PID 80; stack trace: ***
    @     0x71cbb3e45330 (unknown)
    @           0x557ae4 rellic::DecompilationContext::DecompilationContext()
    @           0x435f8f rellic::Decompile()
    @           0x42b243 main
    @     0x71cbb3e2a1ca (unknown)
    @     0x71cbb3e2a28b __libc_start_main
    @           0x42a77e _start
    @                0x0 (unknown)
zsh: segmentation fault (core dumped)  rellic-decomp --input uart.c.o --output
```
The problem is, the bitcode target triple(architecture) is not supported by the LLVM version Rellic depends on. Since bitcode is supposed to be target independent, I can change the target triple using `llvm-dis`. Rellic is finicky and some bitcode files require some more fiddling work with Rellic. So I'm using a different bitcode file from here. 
```shell
 ❯ llvm-dis-15 vm_api.c.o -o vm_api.c.o.ll
```
Then edit `vm_api.c.o.ll` and replace `target triple = "pi32v2"` with `target triple = "i386-pc-none-elf"`. Then I can feed this file directly to Rellic.
```shell
 ❯ rellic-decomp --input vm_api.c.o.ll --output vm_api.rellic.c
```
Some example code
```C
unsigned int vm_api_read_mult(unsigned short start_id, unsigned short end_id, char *buf, unsigned short len) {
    char *call0;
    unsigned short phi1;
    ...
    unsigned short call17;
    unsigned int phi18;
    phi18 = 0U;
    if (buf != (void *)0U) {
        call0 = zalloc(263U);
        if (call0 != (void *)0U) {
        ...
                {
                    call4 = vm_read(phi3, call0, (unsigned short)263U);
                    phi12 = phi2;
                    phi11 = phi1;
        ...
}
```
Rellic output also has some of the same issues, like not being able to recover some struct field values, function argument names, etc., It also takes a long time to run on some files because it's using a constraint solver(`Z3`) under the hood to simplify the output, like removing GOTOs. Or it just crashes on some bitcode files outright with cryptic errors.

# Bitcode Re-targeting
While poking at the SDK some more, I noticed that the SDK saves the intermediate compile states of the output binary to files named like `sdk.elf.*.*.****.bc`(due to compiler argument `--plugin-opt=save-temps`). All of these are bitcode files. This gave me an idea. Why not try to recompile these files to an architecture well supported by decompiler tools like `Ghidra`. 
Let's try to compile the unoptimized bitcode file to x86
```shell
 ❯ llc-15 sdk.elf.0.0.preopt.bc -filetype=obj -o sdk.elf.x86.o --march x86 -O0
llc-15: error: llc-15: sdk.elf.0.0.preopt.bc: error: Invalid value reference from metadata
```
It turns out LLVM toolchains are not backward compatible with old LLVM bitcode. The SDK uses a toolchain based on super old llvm-4.0.1. It is possible to "upgrade" this bitcode using `llvm-dis` to disassemble it and assembling it back, but I've had some other issues with it. So I decided do everything with llvm-4.0.1. The Jieli toolchain doesn't seem to support any other targets than their own chips so I got a prebuilt copy of llvm-4.0.1 from the [llvm website download section](https://releases.llvm.org/download.html#4.0.1). It will complain about missing `libtinfo.so.5` on modern Ubuntu versions, just download `libtinfo5_6.4-4_amd64.deb` from Debian or Ubuntu archives, extract `libtinfo.so.5.x` from it, and put it info LLVM lib directory as `libtinfo..so.5`.

Let's try to compile with llvm-4.0.1
```shell
 ❯ clang+llvm-4.0.1-x86_64-linux-gnu-debian8/bin/llc sdk.elf.0.0.preopt.bc -filetype=obj -o sdk.elf.x86.o --march x86 -O0
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
<inline asm>:1:2: error: unexpected token at start of statement
        %eax = copex(%ecx) ($2)
        ^
LLVM ERROR: Error parsing inline asm
```
Oops, looks like this bitcode has a bunch of inline assembly doing various low level operations, and inline assembly is not architecture independent. Removing these shouldn't affect the decompilation. I can't just remove the entire inline assembly line because it'll break the bitcode semantics. So I decided replace inline assembly body with a nop. 

First disassemble bitcode into bitcode text format.

```shell
 ❯ clang+llvm-4.0.1-x86_64-linux-gnu-debian8/bin/llvm-dis sdk.elf.0.0.preopt.bc -o sdk.elf.0.0.preopt.ll
```
To replace the inline assembly I wrote a python script

```python
import re
import sys

def process_line(line):
    asm_pattern = re.compile(
        r'(?P<lhs>^.*)(?P<call>call.*asm\s+sideeffect\s+)\".*\",\s+\"(?P<consts>.*)\"\(.*\) #'
    )

    match = asm_pattern.search(line)
    if not match:
        return line

    lhs = match.group("lhs")
    call = match.group("call")
    constraint_str = match.group("consts")

    output_c = [c for c in constraint_str.split(',') if (c.strip().startswith('=') or c.strip().startswith('=&')) and not "*" in c.strip()]
    output_constraints = ["=r" for r in output_c]
    new_constraints = ','.join(output_constraints)

    #print(f'{call} -- {len(output_constraints) > 10}', file=sys.stderr)

    new_line = f'{lhs}{call}"nop", "{new_constraints}"() #'

    after_call = line[match.end():]
    return new_line + after_call

def main():
    import fileinput
    for line in fileinput.input():
        print(process_line(line.rstrip('\n')))

if __name__ == "__main__":
    main()

```

run it with
```shell
 ❯ python3 modify.py sdk.elf.0.0.preopt.ll > sdk.elf.0.0.preopt.mod.ll
```
then compile it
```shell
 ❯ clang+llvm-4.0.1-x86_64-linux-gnu-debian8/bin/llc sdk.elf.0.0.preopt.mod.ll -filetype=obj -o sdk.elf.x86.o --march x86 -O0
```
This produces a x86 binary I can import into Ghidra and it recovers all function parameters, struct field names etc. from debug metadata. 

With some features enabled, inline assembly in produced bitcode might try to allocate more registers than x86 has, it'll throw this error.
```shell
 ❯ clang+llvm-4.0.1-x86_64-linux-gnu-debian8/bin/llc sdk.elf.0.0.preopt.mod.ll -filetype=obj -o sdk.elf.x86.o --march x86 -O0
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
'r3' is not a recognized processor for this target (ignoring processor)
error: inline assembly requires more registers than available at line 4811
error: inline assembly requires more registers than available at line 12565
error: inline assembly requires more registers than available at line 9012
error: inline assembly requires more registers than available at line 18167
error: inline assembly requires more registers than available at line 18167
error: inline assembly requires more registers than available at line 18167
error: inline assembly requires more registers than available at line 14960
...
```
I tried ARM architecture since it has more general purpose registers. And this seems to work fine.
```shell
 ❯ clang+llvm-4.0.1-x86_64-linux-gnu-debian8/bin/llc sdk.elf.0.0.preopt.mod.ll -filetype=obj -o sdk.elf.arm.o --march arm -O0
```
Some inline assembly blocks may still allocate more registers than even ARM has, I tried MIPS with even more registers, but it had issues with relocations. The only option was to find these blocks(uncomment the relevant line in the python code above) and remove the body of the entire function. In my case, this was only a few functions relating to some DSP code.
