---
title: hexview — inspect and patch binary files
order: 2
summary: A hex viewer with search and in-place patching, exploring bytes, bit operations and random file access.
level: beginner
chapters: [types-operators-expressions, pointers-arrays, input-output]
skills: [binary I/O, fseek, hex parsing, byte order]
---

## Overview

Binary files (images, executables, save games) are just bytes. `hexview` lets you look at them, find byte patterns, read multi-byte integers, and change individual bytes.

```console
$ ./hexview photo.png
00000000  89 50 4e 47 0d 0a 1a 0a  00 00 00 0d 49 48 44 52  |.PNG........IHDR|
00000010  00 00 03 20 00 00 02 58  08 06 00 00 00 9a 76 82  |... ...X......v.|
$ ./hexview -s 0x10 -n 8 photo.png
00000010  00 00 03 20 00 00 02 58                           |... ...X|
$ ./hexview -f "49 48 44 52" photo.png
found at 0x0000000c
$ ./hexview -u32be 0x10 photo.png
0x10: 800 (0x00000320)
$ ./hexview -p 0x0 0x88 copy.png
patched 0x00000000: 89 -> 88
```

## What you'll practice

- opening files in binary mode and reading with [`fread`](/stdio/fn.fread/);
- random access with [`fseek`](/stdio/fn.fseek/) and [`ftell`](/stdio/fn.ftell/);
- parsing hex numbers ([`strtoul`](/stdlib/fn.strtoul/) with base 0 or 16);
- combining bytes into integers with shifts, in big- and little-endian order;
- naive pattern search in a byte buffer;
- writing in place with mode `"r+b"`.

## Specification

```text
hexview [-s OFFSET] [-n COUNT] FILE      dump COUNT bytes from OFFSET (default: all)
hexview -f "HEX BYTES" FILE              print the offset of every match
hexview -u16le|-u16be|-u32le|-u32be OFFSET FILE
                                         decode an unsigned integer at OFFSET
hexview -p OFFSET BYTE FILE              overwrite one byte
```

Offsets and bytes accept decimal or `0x` hex. Errors (missing file, offset past the end, malformed hex) go to `stderr` with exit status 1.

## Milestones

### 1. Dump

Reuse your solution to [Exercise 7-2](/book/input-output/exercises/#exercise-7-2--hexdump-medium). Add `-s` (seek first) and `-n` (stop after COUNT bytes). Offsets in the left column must reflect the real file position.

### 2. Decode integers

Read 2 or 4 bytes at an offset and combine them. Big-endian means the first byte is most significant:

```c
uint32_t be32(const unsigned char b[4])
{
    return (uint32_t)b[0] << 24 | (uint32_t)b[1] << 16 | (uint32_t)b[2] << 8 | b[3];
}
```

Write `le32`, `be16`, `le16` similarly. Never cast a byte pointer to `uint32_t *`: that breaks on byte order and alignment.

### 3. Pattern search

Parse `"49 48 44 52"` into a byte array (split on spaces, `strtoul(tok, NULL, 16)`). Read the file in chunks and search each chunk. A match can straddle two chunks; handle it by keeping the last `patlen - 1` bytes of the previous chunk at the front of the buffer.

### 4. Patch

Open with `"r+b"`, `fseek` to the offset, read the old byte, `fseek` again (required when switching from reading to writing), write the new byte, and report the change.

## Starter code

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse_number(const char *s, unsigned long *out)
{
    char *end;
    *out = strtoul(s, &end, 0);      /* base 0: accepts 123, 0x7b, 0173 */
    return end != s && *end == '\0' ? 0 : -1;
}

static int dump(FILE *fp, unsigned long offset, unsigned long count)
{
    /* TODO: milestone 1 */
    (void)fp; (void)offset; (void)count;
    return 0;
}

int main(int argc, char *argv[])
{
    unsigned long offset = 0, count = (unsigned long)-1;
    int i = 1;

    for (; i < argc - 1 && argv[i][0] == '-'; i += 2) {
        if (strcmp(argv[i], "-s") == 0 && parse_number(argv[i + 1], &offset) == 0)
            continue;
        if (strcmp(argv[i], "-n") == 0 && parse_number(argv[i + 1], &count) == 0)
            continue;
        fprintf(stderr, "bad option %s\n", argv[i]);
        return 1;
    }
    if (i != argc - 1) {
        fprintf(stderr, "usage: %s [-s OFFSET] [-n COUNT] FILE\n", argv[0]);
        return 1;
    }
    FILE *fp = fopen(argv[i], "rb");
    if (fp == NULL) {
        perror(argv[i]);
        return 1;
    }
    int rc = dump(fp, offset, count);
    fclose(fp);
    return rc;
}
```

## Testing

```sh
printf 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' > t.bin
./hexview -s 0x10 -n 4 t.bin              # 00000010  51 52 53 54 ... |QRST|
./hexview -f "4f 50" t.bin                # found at 0x0000000e
printf '\x01\x02\x03\x04' > n.bin
./hexview -u32be 0 n.bin                  # 16909060 (0x01020304)
./hexview -u32le 0 n.bin                  # 67305985 (0x04030201)
cp t.bin p.bin && ./hexview -p 0 0x61 p.bin && head -c 3 p.bin   # aBC
cmp <(./hexview t.bin) <(xxd t.bin | cut -c1-9) # compare offsets with a real tool
```

## Stretch goals

- `-i` to identify common formats from magic numbers (PNG `89 50 4E 47`, ELF `7F 45 4C 46`, ZIP `50 4B 03 04`, PDF `25 50 44 46`).
- A `-d` diff mode comparing two files and printing differing ranges side by side.
- Wildcards in patterns (`"49 ?? 44"`).
- Parse a PNG file's chunk list: each chunk is a 4-byte big-endian length, a 4-byte type, data, and a CRC.
