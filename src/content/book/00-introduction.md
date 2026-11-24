---
title: Introduction
number: "0"
order: 0
summary: What C is, where it came from, and how this book is organized.
---

C is a general-purpose programming language with a small set of features, close to the machine, and very widely used. It was designed by Dennis Ritchie at Bell Labs in the early 1970s for writing the UNIX operating system, and it is still the language of operating systems, embedded firmware, language runtimes, databases and many of the libraries other languages call into.

C is sometimes called a "systems programming language", but it has been used just as well to write numerical, text-processing and database programs. It is not tied to any one machine or operating system: a carefully written C program can be compiled on anything from a microcontroller to a supercomputer.

## About this book

This book follows the structure of the classic text by Brian W. Kernighan and Dennis M. Ritchie, *The C Programming Language* (2nd edition, Prentice Hall, 1988), often called **K&R**. The explanations and examples here are original; if you want the authors' own words, read their book, which is still one of the best programming books ever written.

Where K&R describes ANSI C (C89), this book also points out what changed in C99, C11, C17 and C23, so the code is modern and compiles cleanly with current compilers.

| Chapter | Covers |
|---|---|
| [1. A Tutorial Introduction](/book/tutorial/) | A fast tour of the essentials through small, complete programs. |
| [2. Types, Operators, and Expressions](/book/types-operators-expressions/) | The basic data objects and what you can do with them. |
| [3. Control Flow](/book/control-flow/) | `if`, `switch`, loops, `break`, `continue`, `goto`. |
| [4. Functions and Program Structure](/book/functions-program-structure/) | Functions, scope, linkage, header files, the preprocessor. |
| [5. Pointers and Arrays](/book/pointers-arrays/) | The heart of C: addresses, arrays, strings, function pointers. |
| [6. Structures](/book/structures/) | Grouping data: `struct`, `union`, `typedef`, bit-fields. |
| [7. Input and Output](/book/input-output/) | The standard I/O library. |
| [8. The UNIX System Interface](/book/unix-interface/) | Below the library: file descriptors and system calls. |
| [A. Reference Manual](/book/reference-manual/) | A compact summary of the language itself. |
| [B. Standard Library](/book/standard-library/) | Map of the standard headers, linking into the API reference. |
| [C. GCC and the C Standards](/book/gcc-and-standards/) | How the compiler works, useful flags, and what ANSI C, C99, C11, C17 and C23 mean. |
| [D. Libraries, Tools and Projects](/book/libraries-tools-projects/) | raylib, SQLite, GDB, sanitizers and more, plus great code to read and build-it-yourself guides. |

The rest of this site is the **library reference**: one page per function, macro and type, in the style of Rust's API docs. Press <kbd>S</kbd> anywhere to search it.

## What you need

To start right away, open the [**C Playground**](/playground/): it compiles and runs C in your browser, shows the assembly for every line, and lets you step through programs while watching the stack and heap. Runnable examples throughout this book have a **▶ Try it** button that opens them there.

For real projects you'll want a C compiler and a terminal. On Linux or macOS you already have `cc` (GCC or Clang). On Windows, install MSYS2, WSL, or Visual Studio's command-line tools.

Compile with warnings on; they catch an enormous number of mistakes:

```sh
cc -std=c17 -Wall -Wextra -pedantic -g -o hello hello.c
./hello
```

Add `-fsanitize=address,undefined` while learning: it turns many silent memory errors into clear reports. [Appendix C](/book/gcc-and-standards/) explains these flags, the stages of compilation, and what `-std=c17` means.

## The character of C

A few ideas shape everything else:

- **The programmer is trusted.** C does not check array bounds, does not initialize local variables, and lets you convert between almost any types. This makes C fast and flexible, and makes mistakes costly.
- **Small language, big library.** There is no built-in I/O, string type or memory management in the language proper. All of that is in the standard library, written in C itself.
- **Close to the machine.** Types map onto what hardware provides: bytes, words, addresses. You can usually predict roughly what machine code a C statement becomes.
- **Undefined behavior.** Some erroneous operations (reading out of bounds, signed overflow, using freed memory) have *no* defined meaning. The program may crash, appear to work, or do something bizarre after the optimizer has reasoned from the assumption that it can't happen. Learning to avoid undefined behavior is a large part of learning C.
