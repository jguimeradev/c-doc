---
title: Libraries, Tools and Projects
number: "D"
order: 12
summary: A curated list of C libraries, development tools, and open-source codebases worth using, studying and building with.
---

The standard library is deliberately small. Real C programs lean on a rich ecosystem of libraries, and C programmers rely on excellent tools to find their bugs. This appendix is a hand-picked list of the ones most worth knowing, plus great codebases to read and project-based guides to follow.

Install most of these from your system's package manager (`apt install libsqlite3-dev`, `brew install raylib`, …) and let `pkg-config` supply the compiler flags:

```sh
cc app.c -o app $(pkg-config --cflags --libs sqlite3)
```

## D.1 Debugging and Analysis Tools

These tools turn mysterious crashes into precise answers. Learn GDB and the sanitizers first; they pay for themselves within a day.

| Tool | What it does |
|---|---|
| [**GDB**](https://www.sourceware.org/gdb/) | The GNU debugger: stop programs at breakpoints, step line by line, inspect variables and memory, and get a backtrace from a crash. |
| **Sanitizers** (`-fsanitize=address,undefined`) | Built into GCC and Clang. They add checks at run time that report out-of-bounds accesses, use-after-free, leaks and undefined behavior, with the exact line. See [Appendix C](/book/gcc-and-standards/#c3-flags-worth-knowing). |
| [**Valgrind**](https://valgrind.org) | Runs an unmodified binary on a simulated CPU to find memory errors and leaks (`valgrind --leak-check=full ./prog`). Slower than sanitizers but needs no recompilation. |
| [**rr**](https://rr-project.org) | Records a program's execution so you can replay it in GDB, deterministically, **backwards** as well as forwards. Magical for intermittent bugs. Linux only. |
| **strace** / **ltrace** | Print every system call (or library call) a program makes. The fastest way to see why a program can't find a file. |
| **perf** | Linux's sampling profiler: `perf record ./prog && perf report` shows where the time goes. |
| [**Compiler Explorer**](https://godbolt.org) | Paste C in a browser and see the assembly from dozens of compilers. Great for learning what the optimizer does. |

### A taste of GDB

Here is a program with a classic bug, the missing null check from [section 6.5](/book/structures/#65-self-referential-structures):

```c
#include <stdio.h>

struct node { int value; struct node *next; };

int sum(const struct node *n)
{
    int total = 0;
    while (n->value >= 0) {      /* bug: should test n != NULL */
        total += n->value;
        n = n->next;
    }
    return total;
}

int main(void)
{
    struct node c = { 3, NULL }, b = { 2, &c }, a = { 1, &b };
    printf("%d\n", sum(&a));
    return 0;
}
```

It crashes with nothing but "Segmentation fault". Compile with `-g` and run it under GDB:

```console
$ gcc -g -O0 crash.c -o crash
$ gdb -q ./crash
(gdb) run
Program received signal SIGSEGV, Segmentation fault.
0x0000555555555163 in sum (n=0x0) at crash.c:8
8	    while (n->value >= 0) {      /* bug: should test n != NULL */
(gdb) bt
#0  0x0000555555555163 in sum (n=0x0) at crash.c:8
#1  0x00005555555551af in main () at crash.c:18
(gdb) print total
$1 = 6
```

In three commands GDB shows the crashing line, that `n` is a null pointer, how we got there (`bt` is *backtrace*), and that the loop had already summed all three nodes. The essential commands:

| Command | Meaning |
|---|---|
| `run [args]` | start the program |
| `break file.c:42` / `break func` | stop at a line or function |
| `next` / `step` | run one line, stepping over / into calls |
| `continue` | run until the next breakpoint |
| `print expr` | show any C expression, e.g. `print *n` or `print arr[3]@5` |
| `bt` | backtrace: the chain of calls that led here |
| `frame N`, `up`, `down` | move between stack frames |
| `watch var` | stop whenever `var` changes |
| `tui enable` | split-screen view with the source code |

## D.2 Building and Code Quality

| Tool | What it does |
|---|---|
| [**GNU Make**](https://www.gnu.org/software/make/) | The classic build tool: rebuilds only what changed, based on dependency rules ([Exercise 4-6](/book/functions-program-structure/exercises/#exercise-4-6--splitting-a-program-into-files-medium)). |
| [**CMake**](https://cmake.org) | The most widely used cross-platform build generator, producing Makefiles, Ninja files or Visual Studio projects. |
| [**Meson**](https://mesonbuild.com) | A fast, readable modern build system, used by GNOME, systemd and many others. |
| [**Clang tools**](https://clang.llvm.org) | `clang-format` formats code automatically; `clang-tidy` finds bugs and style problems; `clangd` gives your editor completions and go-to-definition. |
| [**Cppcheck**](https://cppcheck.sourceforge.io) | A static analyzer that finds bugs without running the code. GCC's own `-fanalyzer` does similar work. |

## D.3 Graphics, Games and GUIs

| Library | What it is | License |
|---|---|---|
| [**raylib**](https://www.raylib.com) | A simple, beautifully documented library for games and graphical programs: windows, 2-D and 3-D drawing, input, audio. The friendliest way to see your C on screen. | zlib |
| [**SDL**](https://www.libsdl.org) | Simple DirectMedia Layer: cross-platform windows, input, audio and rendering. Used by countless commercial games and emulators. | zlib |
| [**GLFW**](https://www.glfw.org) | Windows, OpenGL/Vulkan contexts and input, and nothing more. Pair it with your own renderer. | zlib |
| [**sokol**](https://github.com/floooh/sokol) | Single-file headers for graphics, app, audio and time, running on desktop, mobile and the web. | zlib |
| [**stb**](https://github.com/nothings/stb) | Single-file libraries: `stb_image` (load PNG/JPG), `stb_truetype` (fonts), `stb_image_write` and more. Drop one header into your project. | public domain / MIT |
| [**cimgui**](https://github.com/cimgui/cimgui) | C bindings for Dear ImGui, the immediate-mode GUI used for debug panels and tools. | MIT |

### A taste of raylib

A circle you can move with the arrow keys, in under 30 lines:

```c
#include "raylib.h"

int main(void)
{
    InitWindow(800, 450, "raylib: move the ball");
    SetTargetFPS(60);

    Vector2 ball = { 400, 225 };

    while (!WindowShouldClose()) {          /* until Esc or the close button */
        if (IsKeyDown(KEY_RIGHT)) ball.x += 4;
        if (IsKeyDown(KEY_LEFT))  ball.x -= 4;
        if (IsKeyDown(KEY_DOWN))  ball.y += 4;
        if (IsKeyDown(KEY_UP))    ball.y -= 4;

        BeginDrawing();
            ClearBackground(RAYWHITE);
            DrawText("Use the arrow keys", 10, 10, 20, DARKGRAY);
            DrawCircleV(ball, 30, MAROON);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
```

```sh
# Linux, with raylib installed system-wide
gcc ball.c -o ball -lraylib -lGL -lm -lpthread -ldl -lrt -lX11
# or, if your raylib ships a pkg-config file
gcc ball.c -o ball $(pkg-config --cflags --libs raylib)
```

The structure (initialize, loop until done, update state, draw a frame, shut down) is the skeleton of every game. Try porting the [Game of Life project](/projects/life/) to raylib, drawing each cell as a rectangle.

## D.4 Data, Networking and Utilities

| Library | What it is | License |
|---|---|---|
| [**SQLite**](https://sqlite.org) | A complete SQL database in a single C file. Likely the most widely deployed software in the world: it's in every phone, browser and countless apps. Its source code is famously well tested and commented. | public domain |
| [**libcurl**](https://curl.se/libcurl/) | HTTP(S), FTP and dozens of other protocols. The library behind the `curl` command. | curl (MIT-like) |
| [**zlib**](https://zlib.net) | DEFLATE compression, as used by gzip, PNG and ZIP. | zlib |
| [**cJSON**](https://github.com/DaveGamble/cJSON) | A small, single-file JSON parser and printer. | MIT |
| [**Jansson**](https://github.com/akheron/jansson) | A more complete JSON library with a convenient API. | MIT |
| [**libuv**](https://libuv.org) | Cross-platform asynchronous I/O (event loop, sockets, timers, file system). The engine underneath Node.js. | MIT |
| [**libsodium**](https://github.com/jedisct1/libsodium) | Modern, hard-to-misuse cryptography: encryption, signatures, password hashing. | ISC |
| [**PCRE2**](https://github.com/PCRE2Project/pcre2) | Perl-compatible regular expressions. | BSD |
| [**Lua**](https://www.lua.org) | A tiny, fast scripting language written in clean ANSI C and designed to be **embedded** in C programs. Used in games, Neovim, Redis and nginx. | MIT |

### A taste of SQLite

Prepared statements with bound parameters are the safe way to put user data into SQL (never paste strings into the query text, which invites SQL injection):

```c
#include <sqlite3.h>
#include <stdio.h>

int main(void)
{
    sqlite3 *db;
    sqlite3_stmt *st;

    if (sqlite3_open("books.db", &db) != SQLITE_OK) {
        fprintf(stderr, "open: %s\n", sqlite3_errmsg(db));
        return 1;
    }
    sqlite3_exec(db, "CREATE TABLE IF NOT EXISTS book(title TEXT, year INTEGER);"
                     "INSERT INTO book VALUES ('The C Programming Language', 1978);",
                 NULL, NULL, NULL);

    sqlite3_prepare_v2(db, "SELECT title, year FROM book WHERE year < ?;", -1, &st, NULL);
    sqlite3_bind_int(st, 1, 2000);                     /* parameters are numbered from 1 */
    while (sqlite3_step(st) == SQLITE_ROW)
        printf("%s (%d)\n", (const char *)sqlite3_column_text(st, 0), sqlite3_column_int(st, 1));
    sqlite3_finalize(st);

    sqlite3_close(db);
    return 0;
}
```

```sh
gcc books.c -o books -lsqlite3
```

(Real code should check the return value of every call; this example skips some for brevity.)

### A taste of zlib

```c
#include <stdio.h>
#include <string.h>
#include <zlib.h>

int main(void)
{
    const char *text = "C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C!";
    uLong src_len = (uLong)strlen(text) + 1;
    Bytef packed[256], unpacked[256];
    uLongf packed_len = sizeof packed, unpacked_len = sizeof unpacked;

    if (compress(packed, &packed_len, (const Bytef *)text, src_len) != Z_OK)
        return 1;
    if (uncompress(unpacked, &unpacked_len, packed, packed_len) != Z_OK)
        return 1;
    printf("%lu -> %lu bytes, round trip %s\n", src_len, packed_len,
           strcmp(text, (char *)unpacked) == 0 ? "ok" : "FAILED");
    return 0;
}
```

```console
$ gcc z.c -o z -lz && ./z
61 -> 15 bytes, round trip ok
```

Repetitive data compresses dramatically. Compare it with your [Huffman project](/projects/huff/): DEFLATE is Huffman coding plus LZ77 back-references.

## D.5 Testing

| Framework | What it is | License |
|---|---|---|
| [**Unity**](https://github.com/ThrowTheSwitch/Unity) | A tiny unit-test framework designed for embedded C, though fine anywhere. | MIT |
| [**cmocka**](https://cmocka.org) | Unit testing with mock objects; used by Samba and others. | Apache 2.0 |
| [**Criterion**](https://github.com/Snaipe/Criterion) | A modern framework with automatic test registration and parallel runs. | MIT |
| [**greatest**](https://github.com/silentbicycle/greatest) | A single-header framework with no dependencies. | ISC |

You don't strictly need a framework: a test program full of [`assert`](/assert/macro.assert/) calls, run with sanitizers enabled, catches a remarkable amount.

## D.6 Embedded Systems

C still dominates microcontrollers, where every byte and cycle counts.

| Project | What it is |
|---|---|
| [**Raspberry Pi Pico SDK**](https://github.com/raspberrypi/pico-sdk) | The C SDK for the inexpensive RP2040/RP2350 microcontroller boards: GPIO, timers, USB, and the programmable I/O blocks. |
| [**FreeRTOS**](https://www.freertos.org) | A small real-time operating system kernel (tasks, queues, semaphores), ported to dozens of microcontroller families. MIT licensed. |
| [**Zephyr**](https://www.zephyrproject.org) | A larger RTOS with drivers, networking and Bluetooth, backed by the Linux Foundation. Apache 2.0 licensed. |

Blinking an LED on a Pico is a satisfying first step away from the terminal, and it makes [section 2.9](/book/types-operators-expressions/#29-bitwise-operators)'s bit manipulation very concrete.

## D.7 Great Code to Read

Reading excellent code is one of the best ways to improve. These projects are known for clarity, and each is a working example of ideas from this book.

| Project | Why it's worth reading |
|---|---|
| [**Lua**](https://www.lua.org/source/) | A complete language (parser, compiler, virtual machine, garbage collector) in about 30,000 lines of portable C. |
| [**SQLite**](https://sqlite.org/src) | Meticulous comments, and a test suite many times larger than the code itself. |
| [**Redis**](https://github.com/redis/redis) / [**Valkey**](https://github.com/valkey-io/valkey) | An in-memory database with clear data structures (`dict.c`, `sds.c`, `ziplist`/`listpack`) and an event loop in `ae.c`. |
| [**Git**](https://github.com/git/git) | Content-addressed storage, hashing and file formats in a huge but approachable codebase. |
| [**curl**](https://github.com/curl/curl) | Decades of portable, defensive C and careful security practice. |
| [**musl**](https://musl.libc.org) | A C standard library implementation focused on simplicity and correctness. See how `printf`, `malloc` and `qsort` are really written. |
| [**xv6**](https://github.com/mit-pdos/xv6-riscv) | MIT's teaching operating system: a small, complete UNIX-like kernel (processes, a file system, system calls) used in their OS course. |
| [**kilo**](https://github.com/antirez/kilo) | A complete text editor in about 1,000 lines, using only the terminal. |
| [**QuickJS**](https://bellard.org/quickjs/) | A full JavaScript engine by Fabrice Bellard, compact and fast. |
| [**DOOM**](https://github.com/id-Software/DOOM) | The 1993 source release of id Software's classic game. Fixed-point math and clever data structures for slow machines. |
| [**Linux**](https://github.com/torvalds/linux) | The kernel itself. Start with `lib/` (`list.h`, `rbtree.c`) rather than the core. |

## D.8 Build-it-yourself Guides

Project-based guides that walk you through building something real in C, an excellent next step after this book's [projects](/projects/):

| Guide | You build |
|---|---|
| [**Build Your Own Text Editor**](https://viewsourcecode.org/snaptoken/kilo/) | the kilo editor, step by step: raw terminal mode, rendering, search, syntax highlighting |
| [**Crafting Interpreters**](https://craftinginterpreters.com) | in part III, `clox`: a bytecode virtual machine for a complete scripting language, in C |
| [**Beej's Guide to Network Programming**](https://beej.us/guide/bgnet/) | TCP and UDP clients and servers with the sockets API |
| [**chibicc**](https://github.com/rui314/chibicc) | a C compiler that compiles itself, developed in hundreds of small, readable commits |
| [**Handmade Hero**](https://handmadehero.org) | a complete game from scratch, without libraries, in a long video series |

For a broader catalog, the community-maintained [awesome-c](https://github.com/oz123/awesome-c) list collects hundreds more libraries by category.
