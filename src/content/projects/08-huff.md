---
title: huff — a Huffman file compressor
order: 8
summary: Compress and decompress files with Huffman coding, using frequency counting, a priority queue, trees and bit-level I/O.
level: advanced
chapters: [types-operators-expressions, pointers-arrays, structures, input-output]
skills: [binary trees, priority queues, bit manipulation, file formats]
---

## Overview

Huffman coding gives frequent bytes short bit codes and rare bytes long ones. It's a building block of ZIP, gzip, PNG and JPEG. You'll write a compressor and a matching decompressor:

```console
$ ./huff -c moby-dick.txt moby.huf
1257274 -> 717418 bytes (57.1%)
$ ./huff -d moby.huf out.txt
$ cmp moby-dick.txt out.txt && echo identical
identical
```

## How Huffman coding works

1. Count how often each of the 256 byte values occurs.
2. Make a leaf node for each byte that occurs, weighted by its count.
3. Repeatedly remove the two lightest nodes and join them under a new parent whose weight is their sum, until one node (the root) remains.
4. Each byte's code is the path from the root to its leaf: `0` for left, `1` for right. Frequent bytes end up near the root, so they get short codes.
5. To compress, write each byte's code as bits. To decompress, read bits and walk the tree from the root, emitting a byte whenever you reach a leaf.

No code is a prefix of another (each byte is at a leaf), so the bit stream decodes unambiguously.

## What you'll practice

- a binary tree built from `struct` nodes and pointers;
- a binary **min-heap** in an array as a priority queue;
- recursion to assign codes;
- bit-level output: packing variable-length codes into bytes;
- designing a file header so the decompressor can rebuild the same tree.

## Specification

`huff -c IN OUT` compresses; `huff -d IN OUT` decompresses.

**File format:**

```text
magic    4 bytes   "HUF1"
length   8 bytes   original size in bytes, little-endian
counts   256 × 4 bytes   frequency of each byte value, little-endian
data     the encoded bits, most significant bit first, last byte zero-padded
```

Storing all 256 counts (1 KB) is simple and lets the decoder rebuild exactly the same tree. **Both sides must break ties in the same way** when building it.

Edge cases that must work: an empty file, a file with only one distinct byte (its code would be empty, so give it the code `0`), and binary files containing every byte value.

## Milestones

### 1. Count and build the tree

Count bytes with `fread` into `uint64_t freq[256]`. Implement a min-heap of node pointers ordered by weight, breaking ties by a sequence number so the result is deterministic. Build the tree and print each byte's code for a small test input.

### 2. Codes

Walk the tree recursively, carrying the current code in a `uint64_t` and its length. Store `code[256]` and `len[256]`. (With at most 256 symbols, can a code exceed 64 bits? Work out the worst case: it requires Fibonacci-like frequencies and a very large file, but be defensive.)

### 3. Bit writer and reader

```c
struct bitwriter { FILE *fp; unsigned char acc; int n; };

void put_bit(struct bitwriter *w, int bit)
{
    w->acc = (unsigned char)(w->acc << 1 | (bit & 1));
    if (++w->n == 8) {
        putc(w->acc, w->fp);
        w->acc = 0;
        w->n = 0;
    }
}
```

Add `flush_bits` (pad the last byte with zeros), and a matching `get_bit` reader.

### 4. Compress

Write the header, then for each input byte write its code's bits from most significant to least. Report the ratio.

### 5. Decompress

Read the header, rebuild the tree from the counts using **the same** construction code, then decode exactly `length` bytes, walking the tree one bit at a time.

## Starter code

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

struct node {
    uint64_t weight;
    int symbol;                 /* 0-255 for leaves, -1 for internal nodes */
    unsigned seq;               /* creation order, for deterministic ties */
    struct node *left, *right;
};

/* ---- min-heap of node pointers ---- */

static struct node *heap[512];
static int heap_len;

static int less(const struct node *a, const struct node *b)
{
    return a->weight != b->weight ? a->weight < b->weight : a->seq < b->seq;
}

static void heap_push(struct node *n)
{
    int i = heap_len++;
    heap[i] = n;
    while (i > 0 && less(heap[i], heap[(i - 1) / 2])) {     /* sift up */
        struct node *t = heap[i];
        heap[i] = heap[(i - 1) / 2];
        heap[(i - 1) / 2] = t;
        i = (i - 1) / 2;
    }
}

static struct node *heap_pop(void)
{
    struct node *top = heap[0];
    heap[0] = heap[--heap_len];
    for (int i = 0;;) {                                    /* sift down */
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < heap_len && less(heap[l], heap[m])) m = l;
        if (r < heap_len && less(heap[r], heap[m])) m = r;
        if (m == i)
            break;
        struct node *t = heap[i];
        heap[i] = heap[m];
        heap[m] = t;
        i = m;
    }
    return top;
}

static struct node *new_node(uint64_t w, int sym, struct node *l, struct node *r)
{
    static unsigned seq = 0;
    struct node *n = malloc(sizeof *n);
    if (n == NULL)
        abort();
    *n = (struct node){ w, sym, seq++, l, r };
    return n;
}

static struct node *build_tree(const uint64_t freq[256])
{
    heap_len = 0;
    for (int s = 0; s < 256; s++)
        if (freq[s] > 0)
            heap_push(new_node(freq[s], s, NULL, NULL));
    if (heap_len == 0)
        return NULL;
    while (heap_len > 1) {
        struct node *a = heap_pop(), *b = heap_pop();
        heap_push(new_node(a->weight + b->weight, -1, a, b));
    }
    return heap_pop();
}

static void print_codes(const struct node *n, char *buf, int depth)
{
    if (n->symbol >= 0) {
        buf[depth] = '\0';
        printf("%3d '%c'  %s\n", n->symbol, n->symbol >= 32 && n->symbol < 127 ? n->symbol : '?',
               depth ? buf : "0");
        return;
    }
    buf[depth] = '0'; print_codes(n->left, buf, depth + 1);
    buf[depth] = '1'; print_codes(n->right, buf, depth + 1);
}

int main(void)
{
    uint64_t freq[256] = {0};
    int c;
    while ((c = getchar()) != EOF)
        freq[c]++;
    struct node *root = build_tree(freq);
    char buf[257];
    if (root)
        print_codes(root, buf, 0);
    return 0;   /* TODO: free the tree; then milestones 3-5 */
}
```

Run it as `echo "abracadabra" | ./huff` to see the codes: `a`, the most common letter, gets the shortest.

## Testing

```sh
for f in /dev/null tests/one-byte tests/aaaa.txt /bin/ls book.txt; do
    ./huff -c "$f" t.huf && ./huff -d t.huf t.out && cmp "$f" t.out || echo "FAIL: $f"
done
head -c 1000000 /dev/urandom > random.bin   # random data shouldn't shrink: why?
```

Measure compression on text, source code, an executable, and random data, and explain the differences. Random data grows slightly: every byte value is equally likely, so every code is 8 bits long, and the header is pure overhead.

## Stretch goals

- **Canonical Huffman codes:** store only each symbol's code length (256 bytes instead of 1 KB) and reconstruct codes from the lengths, as DEFLATE does.
- **Table-driven decoding:** decode 8 or more bits at a time using a lookup table instead of walking the tree bit by bit, and measure the speedup.
- Combine with a simple LZ77 stage (replace repeated strings by back-references), which is essentially how gzip works.
- Streaming: compress data larger than memory by processing it in blocks, each with its own table.
