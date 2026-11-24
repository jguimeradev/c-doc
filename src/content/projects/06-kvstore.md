---
title: kvstore — a persistent key-value database
order: 6
summary: An in-memory hash table backed by an append-only log, with crash recovery and compaction.
level: advanced
chapters: [structures, input-output, unix-interface]
skills: [hash tables, binary file formats, checksums, fsync, compaction]
platform: POSIX (Linux, macOS, BSD, WSL)
---

## Overview

You'll build a small database in the style of Bitcask, the storage engine behind Riak. Every write is **appended** to a log file; an in-memory hash table maps each key to its latest value. On startup the log is replayed to rebuild the table. Periodically the log is **compacted** to drop overwritten and deleted entries.

```console
$ ./kv data.log
kv> set user:1 ada
OK
kv> set user:2 grace
OK
kv> get user:1
ada
kv> del user:2
OK
kv> keys
user:1
kv> stats
keys 1, log 87 bytes, live 31 bytes (36%)
kv> compact
compacted 87 -> 31 bytes
```

Kill the process at any moment, restart it, and every acknowledged write is still there.

## What you'll practice

- a resizable hash table with string keys ([section 6.6](/book/structures/#66-table-lookup), plus growth);
- designing a binary record format with lengths and a checksum;
- low-level I/O: `open` with `O_APPEND`, `write`, `fsync`, `rename` ([Chapter 8](/book/unix-interface/));
- detecting and recovering from a torn (partially written) final record;
- thinking about durability: what has really reached the disk when you print `OK`?

## Specification

**Record format** (all integers little-endian):

```text
+---------+---------+-----------+---------+---------+
| crc32   | flags   | key_len   | val_len | key ... | value ...
| 4 bytes | 1 byte  | 2 bytes   | 4 bytes |         |
+---------+---------+-----------+---------+---------+
```

- `flags` bit 0 set means the record is a **deletion** (tombstone, `val_len` = 0).
- `crc32` covers everything after itself.
- Keys are at most 1024 bytes; values at most 16 MB.

**Behavior:**

- `set K V` appends a record, `fsync`s the file, updates the table, then prints `OK`.
- `get K` prints the value or `(nil)`.
- `del K` appends a tombstone and removes the key from the table.
- On startup, read records in order. If a record is truncated or its CRC doesn't match, **truncate the file at that point** (it was a write interrupted by a crash) and report how many bytes were dropped.
- `compact` writes all live pairs to `data.log.tmp`, `fsync`s it, and `rename`s it over the log.

## Milestones

### 1. The in-memory table

Implement `kv_get`, `kv_set` (copying key and value), `kv_del`, `kv_free`. Grow the bucket array (doubling, rehashing every entry) when the load factor exceeds 0.75. Test it with a million random operations against a simple, slow reference (an array scanned linearly).

### 2. Writing records

Write `append_record(fd, flags, key, klen, val, vlen)`: build the record in a buffer, compute the CRC, write it with a `write_all` loop ([section 8.2](/book/unix-interface/#82-low-level-io-read-and-write)), then `fsync`.

CRC-32 (the zlib/PNG variant) in a few lines:

```c
uint32_t crc32(const unsigned char *p, size_t n)
{
    uint32_t c = 0xFFFFFFFFu;
    while (n--) {
        c ^= *p++;
        for (int k = 0; k < 8; k++)
            c = (c >> 1) ^ (0xEDB88320u & (0u - (c & 1u)));
    }
    return ~c;
}
```

### 3. Replay and recovery

Read the log from the start, applying each record. Stop at the first incomplete or corrupt record, `ftruncate` the file there, and continue. Test by truncating a log at every possible byte offset and checking that recovery never crashes and keeps exactly the complete records.

### 4. Compaction

Write every live key-value pair to a new file, `fsync` it, `rename` it over the old log, and `fsync` the **directory** so the rename itself is durable. Reopen the log for appending.

### 5. Command loop

Read commands from `stdin`, one per line. Values may contain spaces (everything after the key). Add `keys`, `stats`, `compact`.

## Starter code

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct kv_entry {
    char *key;
    char *val;
    size_t vlen;
    struct kv_entry *next;
};

struct kv {
    struct kv_entry **buckets;
    size_t nbuckets, count;
};

static uint64_t hash(const char *s)          /* FNV-1a, 64-bit */
{
    uint64_t h = 1469598103934665603u;
    for (; *s; s++) {
        h ^= (unsigned char)*s;
        h *= 1099511628211u;
    }
    return h;
}

static struct kv_entry **find_slot(struct kv *t, const char *key)
{
    struct kv_entry **p = &t->buckets[hash(key) % t->nbuckets];
    while (*p != NULL && strcmp((*p)->key, key) != 0)
        p = &(*p)->next;
    return p;          /* points at the matching entry, or at the NULL ending the chain */
}

int kv_init(struct kv *t)
{
    t->nbuckets = 16;
    t->count = 0;
    t->buckets = calloc(t->nbuckets, sizeof *t->buckets);
    return t->buckets ? 0 : -1;
}

const char *kv_get(struct kv *t, const char *key)
{
    struct kv_entry *e = *find_slot(t, key);
    return e ? e->val : NULL;
}

/* TODO: kv_set (with growth), kv_del, kv_free, then the log */

int main(void)
{
    struct kv t;
    if (kv_init(&t) < 0)
        return 1;
    printf("%s\n", kv_get(&t, "missing") ? "found" : "(nil)");
    free(t.buckets);
    return 0;
}
```

`find_slot` returns a pointer to the *link* rather than to the entry, so the same function serves lookup, insertion at the end of the chain, and deletion (`*slot = (*slot)->next`).

## Testing

- **Model test:** generate random `set`/`get`/`del` sequences and compare every `get` with an independent implementation.
- **Crash test:** write a script that starts `kv`, sends many `set`s, kills it with `kill -9` at a random moment, restarts it, and checks that every key that was acknowledged with `OK` has its value.
- **Corruption test:** flip a random byte in the middle of a log. Recovery should stop there and report it, not crash or return garbage.
- **Benchmark:** time 100,000 sets with and without `fsync` after each. The difference shows the real cost of durability, and motivates batching (group commit).

## Stretch goals

- Store only `(file offset, length)` in the hash table instead of the value, and read values from the log on `get`, so the data set can exceed RAM.
- Group commit: acknowledge a batch of writes with one `fsync`.
- A TCP server speaking a tiny subset of the Redis protocol, so `redis-cli` can talk to it.
- Snapshot iteration: let `keys` run while writes continue.
