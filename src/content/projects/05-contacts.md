---
title: contacts — an address book with persistence
order: 5
summary: A command-driven address book that stores records in a CSV file, with search, sorting and safe saving.
level: intermediate
chapters: [pointers-arrays, structures, input-output]
skills: [dynamic arrays, structs, qsort, CSV, atomic file updates]
---

## Overview

`contacts` manages an address book stored in a plain CSV file. Each invocation loads the file, performs one command, and (if anything changed) writes it back safely.

```console
$ ./contacts add "Ada Lovelace" ada@example.org "+44 20 7946 0000"
added #1
$ ./contacts add "Grace Hopper" grace@example.org ""
added #2
$ ./contacts list --sort name
  1  Ada Lovelace     ada@example.org     +44 20 7946 0000
  2  Grace Hopper     grace@example.org
$ ./contacts find hop
  2  Grace Hopper     grace@example.org
$ ./contacts rm 1
removed #1
```

## What you'll practice

- a **dynamic array** of structs that grows with [`realloc`](/stdlib/fn.realloc/);
- owning strings: who allocates, who frees;
- parsing and writing CSV, including quoting fields that contain commas;
- sorting with [`qsort`](/stdlib/fn.qsort/) and selectable comparison functions;
- writing a file **atomically**: write a temporary file, then [`rename`](/stdio/fn.rename/) it over the original, so a crash never leaves a half-written address book.

## Specification

```text
contacts [-f FILE] add NAME EMAIL PHONE
contacts [-f FILE] list [--sort name|email|id]
contacts [-f FILE] find TEXT          case-insensitive match in any field
contacts [-f FILE] rm ID
contacts [-f FILE] edit ID FIELD VALUE
```

- Default file: `contacts.csv` in the current directory, created on first `add`.
- File format: header line `id,name,email,phone`, then one record per line. Fields containing `,` or `"` are wrapped in double quotes with inner quotes doubled (`"Smith, ""Jr"""`).
- IDs are assigned as one more than the largest existing ID and never reused within a file.
- Exit status 0 on success, 1 for "not found", 2 for usage or I/O errors.

## Milestones

### 1. The data model

```c
struct contact {
    int id;
    char *name, *email, *phone;   /* each malloc'd */
};

struct book {
    struct contact *items;
    size_t len, cap;
};
```

Write `book_add` (grow `cap` by doubling when `len == cap`), `book_free`, and `contact_free`. Test with hard-coded contacts and AddressSanitizer before touching files.

### 2. Saving

Write `book_save(const struct book *b, const char *path)`: write to `path.tmp`, check every `fprintf` and the final [`fclose`](/stdio/fn.fclose/), then `rename(path.tmp, path)`. Write a `csv_write_field` helper that quotes when needed.

### 3. Loading

Read lines with [`fgets`](/stdio/fn.fgets/) (or POSIX `getline` for unlimited length). Parse with a small state machine that handles quoted fields: states `START`, `UNQUOTED`, `QUOTED`, `QUOTE_IN_QUOTED`.

### 4. Commands

Dispatch on `argv[1]` with a table of `{name, handler}` pairs (see [section 5.11](/book/pointers-arrays/#511-pointers-to-functions)). Implement `list`, `find`, `rm` and `edit`.

### 5. Sorting

Write `by_name`, `by_email` and `by_id` comparators. Sort a copy of the pointer array, or sort the records themselves; think about which is better.

## Starter code

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct contact {
    int id;
    char *name, *email, *phone;
};

struct book {
    struct contact *items;
    size_t len, cap;
};

static char *dup(const char *s)
{
    char *p = malloc(strlen(s) + 1);
    if (p == NULL) {
        perror("malloc");
        exit(2);
    }
    return strcpy(p, s);
}

static void book_add(struct book *b, int id, const char *name, const char *email, const char *phone)
{
    if (b->len == b->cap) {
        size_t cap = b->cap ? b->cap * 2 : 8;
        struct contact *p = realloc(b->items, cap * sizeof *p);
        if (p == NULL) {
            perror("realloc");
            exit(2);
        }
        b->items = p;
        b->cap = cap;
    }
    b->items[b->len++] = (struct contact){ id, dup(name), dup(email), dup(phone) };
}

static void book_free(struct book *b)
{
    for (size_t i = 0; i < b->len; i++) {
        free(b->items[i].name);
        free(b->items[i].email);
        free(b->items[i].phone);
    }
    free(b->items);
    *b = (struct book){0};
}

static void csv_write_field(FILE *out, const char *s)
{
    if (strpbrk(s, ",\"\n") == NULL) {
        fputs(s, out);
        return;
    }
    putc('"', out);
    for (; *s; s++) {
        if (*s == '"')
            putc('"', out);      /* double embedded quotes */
        putc(*s, out);
    }
    putc('"', out);
}

int main(void)
{
    struct book b = {0};
    book_add(&b, 1, "Ada Lovelace", "ada@example.org", "+44 20 7946 0000");
    book_add(&b, 2, "Smith, \"Jr\"", "jr@example.org", "");
    for (size_t i = 0; i < b.len; i++) {
        printf("%d,", b.items[i].id);
        csv_write_field(stdout, b.items[i].name);
        putchar(',');
        csv_write_field(stdout, b.items[i].email);
        putchar(',');
        csv_write_field(stdout, b.items[i].phone);
        putchar('\n');
    }
    book_free(&b);
    return 0;
}
```

## Testing

- **Round trip:** load a file, save it, and `cmp` the two: they must be identical. Include names with commas, quotes, and non-ASCII characters (UTF-8 passes through untouched).
- **Crash safety:** add `abort()` just before `rename` and confirm the original file is intact.
- **Memory:** run the whole command set under `-fsanitize=address` with leak detection; every `malloc` must be freed.
- **Edge cases:** empty file, missing file, file with only a header, `rm` of a non-existent ID, a 10,000-contact file generated by a script.

## Stretch goals

- An interactive mode (`contacts shell`) with a prompt and commands, keeping the book in memory and saving on exit.
- Fuzzy search: rank results by edit distance to the query.
- Import and export vCard (`.vcf`) files.
- File locking (`flock` on POSIX) so two simultaneous invocations can't lose each other's changes.
