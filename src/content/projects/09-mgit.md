---
title: mgit — a Git clone
order: 9
summary: Store and read files as Git objects that real Git understands, using SHA-1 content addressing, zlib compression and the on-disk layout of .git/objects.
level: advanced
chapters: [types-operators-expressions, pointers-arrays, input-output, unix-interface]
skills: [content addressing, hashing, binary file formats, zlib, interoperability]
platform: POSIX + zlib (Linux, macOS, BSD, WSL)
---

## Overview

Underneath its commands, Git is a **content-addressed object store**. Every file is stored as an object, and the object's name is the SHA-1 hash of its contents. You'll write `mgit`, a clone of that foundation. You're done when real Git can read the repository `mgit` writes, and `mgit` can read objects that real Git wrote:

```console
$ ./mgit init
Initialized empty mgit repository in .git/
$ echo "hello world" > hello.txt
$ ./mgit hash-object -w hello.txt
3b18e512dba79e4c8300dd08aeb37f8e728b8dad
$ git cat-file -p 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
hello world
$ git hash-object hello.txt
3b18e512dba79e4c8300dd08aeb37f8e728b8dad
```

The project has **one milestone**: it's small enough to finish in a sitting or two. Because the target format is Git's own, the real `git` command can check your work.

## How Git stores a file

1. Read the file's bytes. Say there are `N` of them.
2. Prepend a header: the ASCII text `blob N` followed by a single NUL byte. For `hello.txt` above, the object is `blob 12\0hello world\n`.
3. The object's **id** is the SHA-1 of header + contents: 20 bytes, written as 40 lowercase hex digits.
4. Compress header + contents with zlib and write the result to `.git/objects/XX/YYYY…`, where `XX` is the first two hex digits of the id and `YYYY…` is the other 38.

Reading an object reverses this: find the file from the id, inflate it, split at the first NUL, check that the size in the header matches the number of bytes that follow it, and the rest is the content.

Since the name is computed from the content, identical files are stored once, and any corruption is detectable: hash the content again and compare. Trees (directories) and commits are stored the same way with a different type word in the header, as described in the stretch goals.

## What you'll practice

- **bit manipulation** on `uint32_t`: rotations, `&`, `|`, `^` and `~` in SHA-1 (Chapter 2);
- reading a whole file of unknown size into a growing buffer with [`fread`](/stdio/fn.fread/) and [`realloc`](/stdlib/fn.realloc/);
- **binary data with embedded NULs**: why [`strlen`](/string/fn.strlen/) and `%s` are the wrong tools, and [`memchr`](/string/fn.memchr/) and [`memcpy`](/string/fn.memcpy/) are the right ones;
- dispatching subcommands from `argv` ([section 5.10](/book/pointers-arrays/#510-command-line-arguments));
- creating directories with POSIX `mkdir` ([Chapter 8](/book/unix-interface/));
- linking against a third-party library (`-lz`) and reading its documentation;
- testing against a reference implementation: here, Git itself.

## Specification

```text
mgit init                        create .git/ in the current directory
mgit hash-object [-w] FILE       print FILE's blob id; with -w, also store it
mgit cat-file (-p|-t|-s) ID      print an object's content, type or size
```

**`init`** creates `.git/`, `.git/objects/`, `.git/refs/heads/` and a file `.git/HEAD` containing `ref: refs/heads/main` and a newline. Afterwards `git status` must run in that directory without errors. If `.git` already exists, print an error and exit with status 1.

**`hash-object`** prints the 40-hex-digit id followed by a newline. It must print **exactly** what `git hash-object FILE` prints, for every file: empty files, binary files, files with NUL bytes, and files of any size. With `-w`, it also writes the compressed object to `.git/objects/XX/…`, creating the `XX` directory if needed. Writing an object that already exists is harmless: the contents are identical by definition.

**`cat-file`** takes a full 40-digit id. `-t` prints the type (`blob`, `tree`, `commit` or `tag`), `-s` prints the content size in decimal, and `-p` writes the content bytes to `stdout` unchanged. `-p` only needs to handle blobs: trees contain binary ids, and pretty-printing them is a stretch goal. A missing object, a file that doesn't inflate, or a header whose size doesn't match the content are errors: print a message to `stderr` and exit with status 1.

Build with:

```sh
cc -std=c17 -Wall -Wextra -o mgit mgit.c -lz
```

zlib is preinstalled on macOS. On Debian and Ubuntu, install `zlib1g-dev`; on Fedora, `zlib-devel`.

## Milestones

### 1. Objects in, objects out

Implement the three commands in the starter code.

- **`init`**: four `mkdir` calls and an [`fopen`](/stdio/fn.fopen/) for `HEAD`. Check the return value of the first `mkdir` to detect an existing repository.
- **`hash-object`**: read the file into memory with `read_file`. Build the header with [`snprintf`](/stdio/fn.snprintf/), whose return value is its length; add 1 to include the NUL. Feed the header and then the contents to `sha1_update`, and print the id with `to_hex`. For `-w`, copy header and contents into one buffer, compress it with zlib's one-shot `compress(dest, &dest_len, src, src_len)` into a buffer of `compressBound(src_len)` bytes, and write it with [`fwrite`](/stdio/fn.fwrite/). Open the file in binary mode (`"wb"`).
- **`cat-file`**: read the compressed file and inflate it. The uncompressed size isn't known until you've read the header, so use the streaming API: `inflateInit`, then call `inflate` repeatedly, doubling the output buffer whenever it fills, until it returns `Z_STREAM_END`, then `inflateEnd`. Find the NUL with `memchr`, parse the type and size with [`sscanf`](/stdio/fn.sscanf/), and check that the size matches.

Test in this order: first make `hash-object` without `-w` agree with `git hash-object`, because a wrong hash makes everything else wrong. Then check that Git reads what you write (`git cat-file -p`), and finally that you read what Git writes (`git hash-object -w`, then `./mgit cat-file -p`).

<div class="warning">The header's NUL byte is part of the hashed data. <code>sha1_update(&amp;s, hdr, strlen(hdr))</code> leaves it out and produces a valid-looking id that matches nothing in Git. Pass the length that <code>snprintf</code> returned, plus one.</div>

## Starter code

SHA-1 is provided, so the milestone can focus on Git's format. It follows FIPS 180-4, and the tests below check it against Git. (SHA-1 is no longer collision-resistant, and Git is moving to SHA-256, but its object format is still the default.)

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>   /* mkdir (POSIX) */
#include <zlib.h>

/* ---- SHA-1 (FIPS 180-4) ---- */

struct sha1 { uint32_t h[5]; unsigned char buf[64]; uint64_t len; };

static uint32_t rol(uint32_t x, int n) { return x << n | x >> (32 - n); }

static void sha1_block(struct sha1 *s, const unsigned char *p)
{
    uint32_t w[80], a = s->h[0], b = s->h[1], c = s->h[2], d = s->h[3], e = s->h[4];
    for (int i = 0; i < 16; i++)
        w[i] = (uint32_t)p[4*i] << 24 | (uint32_t)p[4*i+1] << 16 | (uint32_t)p[4*i+2] << 8 | p[4*i+3];
    for (int i = 16; i < 80; i++)
        w[i] = rol(w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16], 1);
    for (int i = 0; i < 80; i++) {
        uint32_t f, k;
        if (i < 20)      { f = (b & c) | (~b & d);          k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d;                   k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else             { f = b ^ c ^ d;                   k = 0xCA62C1D6; }
        uint32_t t = rol(a, 5) + f + e + k + w[i];
        e = d; d = c; c = rol(b, 30); b = a; a = t;
    }
    s->h[0] += a; s->h[1] += b; s->h[2] += c; s->h[3] += d; s->h[4] += e;
}

void sha1_init(struct sha1 *s)
{
    *s = (struct sha1){ { 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0 }, {0}, 0 };
}

void sha1_update(struct sha1 *s, const void *data, size_t n)
{
    const unsigned char *p = data;
    while (n--) {
        s->buf[s->len++ % 64] = *p++;
        if (s->len % 64 == 0)
            sha1_block(s, s->buf);
    }
}

void sha1_final(struct sha1 *s, unsigned char out[20])
{
    uint64_t bits = s->len * 8;
    unsigned char pad = 0x80;
    sha1_update(s, &pad, 1);
    pad = 0;
    while (s->len % 64 != 56)
        sha1_update(s, &pad, 1);
    for (int i = 7; i >= 0; i--) {
        unsigned char b = (unsigned char)(bits >> (8 * i));
        sha1_update(s, &b, 1);
    }
    for (int i = 0; i < 20; i++)
        out[i] = (unsigned char)(s->h[i / 4] >> (24 - 8 * (i % 4)));
}

/* ---- helpers ---- */

static void die(const char *msg)
{
    fprintf(stderr, "mgit: %s\n", msg);
    exit(1);
}

/* Reads a whole file into a malloc'd buffer and stores its length in *n. */
unsigned char *read_file(const char *path, size_t *n)
{
    FILE *fp = fopen(path, "rb");
    if (fp == NULL) {
        perror(path);
        exit(1);
    }
    size_t cap = 4096, len = 0, got;
    unsigned char *buf = malloc(cap);
    while (buf != NULL && (got = fread(buf + len, 1, cap - len, fp)) > 0)
        if ((len += got) == cap)
            buf = realloc(buf, cap *= 2);   /* leaks on failure, but we die anyway */
    if (buf == NULL || ferror(fp))
        die("read failed");
    fclose(fp);
    *n = len;
    return buf;
}

void to_hex(const unsigned char id[20], char hex[41])
{
    for (int i = 0; i < 20; i++)
        sprintf(hex + 2 * i, "%02x", id[i]);
}

/* ---- commands: your work goes here ---- */

static int cmd_init(void)
{
    die("init: not implemented");
    return 1;
}

static int cmd_hash_object(int write, const char *file)
{
    (void)write; (void)file;
    die("hash-object: not implemented");
    return 1;
}

static int cmd_cat_file(char mode, const char *id)
{
    (void)mode; (void)id;
    die("cat-file: not implemented");
    return 1;
}

int main(int argc, char **argv)
{
    if (argc == 2 && strcmp(argv[1], "init") == 0)
        return cmd_init();
    if (argc == 3 && strcmp(argv[1], "hash-object") == 0)
        return cmd_hash_object(0, argv[2]);
    if (argc == 4 && strcmp(argv[1], "hash-object") == 0 && strcmp(argv[2], "-w") == 0)
        return cmd_hash_object(1, argv[3]);
    if (argc == 4 && strcmp(argv[1], "cat-file") == 0 && argv[2][0] == '-'
        && argv[2][1] != '\0' && strchr("pts", argv[2][1]) && argv[2][2] == '\0')
        return cmd_cat_file(argv[2][1], argv[3]);
    fprintf(stderr, "usage: mgit init\n"
                    "       mgit hash-object [-w] FILE\n"
                    "       mgit cat-file (-p | -t | -s) ID\n");
    return 2;
}
```

The `argv[2][1] != '\0'` test matters: `strchr` also finds the string's terminating NUL, so without it `-` alone would be accepted.

## Testing

Run these commands in a scratch directory. Git checks every result:

```sh
./mgit init && git status >/dev/null || echo "FAIL: init"

: > empty.txt
printf 'a\0b' > nul.bin
head -c 55 /dev/zero > p55                 # 55 and 64 bytes hit SHA-1's
head -c 64 /dev/zero > p64                 # padding edge cases
head -c 1000000 /dev/urandom > random.bin

for f in empty.txt nul.bin p55 p64 random.bin /bin/ls; do
    id=$(./mgit hash-object -w "$f")
    [ "$id" = "$(git hash-object "$f")" ]      || echo "FAIL: hash $f"
    git cat-file -p "$id" | cmp -s - "$f"      || echo "FAIL: git reads $f"
    [ "$(./mgit cat-file -s "$id")" = "$(wc -c < "$f" | tr -d ' ')" ] || echo "FAIL: size $f"
done

id=$(git hash-object -w mgit.c)                # an object written by real Git
./mgit cat-file -p "$id" | cmp -s - mgit.c     || echo "FAIL: mgit reads git"
[ "$(./mgit cat-file -t "$id")" = blob ]       || echo "FAIL: type"

git fsck --strict                              # reports dangling blobs, no errors
```

Also check the failure cases: an id with no object, a truncated object file (`head -c 10` of a real one), and `.git` already existing should all print an error and exit with status 1, with no crash under `-fsanitize=address,undefined`.

## Stretch goals

- **Abbreviated ids:** accept any unique prefix of 4 or more digits in `cat-file`, by scanning `.git/objects/XX/` with `opendir` and `readdir` ([section 8.6](/book/unix-interface/#86-example-listing-directories)). Report ambiguous prefixes.
- **`write-tree`:** store the current directory as a tree object. Each entry is `MODE NAME\0` followed by the **raw 20-byte** id of a blob or subtree, with entries sorted by name, so you'll need recursion and `qsort`. Compare with `git add -A && git write-tree`.
- **`cat-file -p` for trees:** print each entry as `MODE TYPE ID\tNAME`, matching `git ls-tree`.
- **`commit-tree TREE -m MSG`:** write a commit object (`tree`, `author`, `committer` lines, a blank line, the message) and update `.git/refs/heads/main`. Then `git log` will show your history.
- **Your own inflate:** replace zlib with a decoder for DEFLATE's stored and fixed-Huffman blocks, building on [huff](/projects/huff/).
