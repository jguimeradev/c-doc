---
title: Structures
number: "6"
order: 6
summary: Grouping related data with struct, self-referential structures, typedef, unions and bit-fields.
---

Real data rarely comes as a lone number. A book has a title, an author, a year and a page count; a pixel has red, green and blue components. A **structure** bundles such related values, each with its own type, into one object you can store, copy and pass around as a unit. Structures are C's main tool for modeling data.

## 6.1 Basics of Structures

Here is a structure describing a 2-D vector:

```c
struct vec2 {
    double x;
    double y;
};
```

`struct vec2` is now a type. `vec2` is the structure's **tag**, and `x` and `y` are its **members**. Member names live in their own namespace per structure, so another structure (or an ordinary variable) can also have something called `x`.

Declaring variables of the type:

```c
struct vec2 position;
struct vec2 velocity = { 1.5, -0.5 };              /* by position */
struct vec2 gravity  = { .x = 0.0, .y = -9.81 };   /* by name (C99) */
```

Members are accessed with the **dot** operator:

```c
position.x += velocity.x * dt;
position.y += velocity.y * dt;
double speed = sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
```

Structures can contain other structures. An axis-aligned box can be stored as its minimum and maximum corners:

```c
struct box {
    struct vec2 min;
    struct vec2 max;
};

struct box screen = { { 0, 0 }, { 1920, 1080 } };
double width = screen.max.x - screen.min.x;
```

## 6.2 Structures and Functions

What you can do with a whole structure: copy it, assign it, pass it to and return it from functions, and take its address. What you can't do: compare two structures with `==` (compare the members instead).

Small structures are perfectly reasonable to pass and return by value:

```c
struct vec2 vec2_add(struct vec2 a, struct vec2 b)
{
    return (struct vec2){ a.x + b.x, a.y + b.y };   /* C99 compound literal */
}

struct vec2 vec2_scale(struct vec2 v, double k)
{
    v.x *= k;            /* v is a copy, so changing it is harmless */
    v.y *= k;
    return v;
}

bool box_contains(struct box b, struct vec2 p)
{
    return p.x >= b.min.x && p.x <= b.max.x
        && p.y >= b.min.y && p.y <= b.max.y;
}
```

For larger structures, or when a function should modify the caller's object, pass a **pointer**. To reach a member through a pointer you could write `(*bp).min`; the parentheses are needed because `.` binds tighter than `*`. That comes up so often that C has a dedicated operator, `->`:

```c
void box_expand(struct box *b, struct vec2 p)   /* grow b to include p */
{
    if (p.x < b->min.x) b->min.x = p.x;
    if (p.y < b->min.y) b->min.y = p.y;
    if (p.x > b->max.x) b->max.x = p.x;
    if (p.y > b->max.y) b->max.y = p.y;
}

double box_area(const struct box *b)            /* read-only access */
{
    return (b->max.x - b->min.x) * (b->max.y - b->min.y);
}
```

`p->m` is exactly `(*p).m`. Both `.` and `->` are at the very top of the precedence table together with `()` and `[]`, so `++p->count` increments the member `count`, not the pointer `p`, and `*p->name` is the first character of the string `p->name` points to.

## 6.3 Arrays of Structures

An array of structures keeps related fields together, record by record. A product catalog might be:

```c
struct product {
    const char *sku;
    const char *name;
    int cents;
};

static const struct product catalog[] = {
    { "A-100", "pencil",      45 },
    { "A-210", "eraser",      80 },
    { "B-015", "notebook",   325 },
    { "B-120", "binder",     599 },
    { "C-007", "stapler",   1250 },
};

#define CATALOG_LEN (sizeof catalog / sizeof catalog[0])
```

`sizeof catalog / sizeof catalog[0]` computes the element count at compile time, so it stays right as rows are added or removed.

Because the table is kept sorted by `sku`, lookups can use [`bsearch`](/stdlib/fn.bsearch/):

```c
#include <stdlib.h>
#include <string.h>

static int cmp_sku(const void *key, const void *elem)
{
    const char *sku = key;
    const struct product *p = elem;
    return strcmp(sku, p->sku);
}

const struct product *find_product(const char *sku)
{
    return bsearch(sku, catalog, CATALOG_LEN, sizeof catalog[0], cmp_sku);
}
```

Printing a price list walks the array with an index or a pointer:

```c
for (const struct product *p = catalog; p < catalog + CATALOG_LEN; p++)
    printf("%-6s %-10s %4d.%02d\n", p->sku, p->name, p->cents / 100, p->cents % 100);
```

## 6.4 Pointers to Structures

Pointer arithmetic works on structure pointers exactly as on any other: `p + 1` points to the next element of the array, however large each element is.

That size isn't always what you'd guess by adding up the members. Many machines require values to sit at addresses that are multiples of their size (their **alignment**), so the compiler may insert unused **padding** bytes:

```c
struct packet {
    char kind;      /* 1 byte                                       */
                    /* likely 7 bytes of padding so 'stamp' aligns  */
    double stamp;   /* 8 bytes                                      */
    short port;     /* 2 bytes, then likely 6 more bytes of padding */
};                  /* sizeof is probably 24, not 11                */
```

Always use `sizeof` rather than computing sizes by hand. Ordering members from largest to smallest alignment often removes most padding. [`offsetof`](/stddef/macro.offsetof/) tells you where each member actually lies.

## 6.5 Self-referential Structures

A structure can't contain a member of its own type (it would be infinitely large), but it **can** contain a pointer to its own type. That's the foundation of linked lists, trees and graphs.

A singly linked list of to-do items:

```c
#include <stdlib.h>
#include <string.h>

struct task {
    char *title;
    int priority;
    struct task *next;
};

/* task_insert: insert a new task into list *head, kept sorted by descending priority */
int task_insert(struct task **head, const char *title, int priority)
{
    struct task *t = malloc(sizeof *t);
    if (t == NULL)
        return -1;
    t->title = malloc(strlen(title) + 1);
    if (t->title == NULL) {
        free(t);
        return -1;
    }
    strcpy(t->title, title);
    t->priority = priority;

    while (*head != NULL && (*head)->priority >= priority)
        head = &(*head)->next;          /* advance to the link we'll rewrite */
    t->next = *head;
    *head = t;
    return 0;
}

void task_free_all(struct task *t)
{
    while (t != NULL) {
        struct task *next = t->next;    /* read before freeing */
        free(t->title);
        free(t);
        t = next;
    }
}
```

The function takes `struct task **head`, a pointer to the pointer that holds the list's first node, so it can update the caller's list when the new node goes at the front. Walking `head` along the `next` links means the "insert at the front" and "insert in the middle" cases are handled by the same code.

A **binary search tree** gives fast ordered lookup. Each node has two child pointers: everything in the left subtree is smaller, everything in the right is larger. Here's one that counts integer occurrences:

```c
struct node {
    int key;
    int count;
    struct node *left, *right;
};

/* tree_add: add key under root; return the (possibly new) root */
struct node *tree_add(struct node *root, int key)
{
    if (root == NULL) {
        root = calloc(1, sizeof *root);    /* zeroed: count 0, children NULL */
        if (root == NULL)
            abort();
        root->key = key;
    }
    if (key < root->key)
        root->left = tree_add(root->left, key);
    else if (key > root->key)
        root->right = tree_add(root->right, key);
    else
        root->count++;
    return root;
}

/* tree_walk: visit nodes in increasing key order */
void tree_walk(const struct node *n, void (*visit)(const struct node *))
{
    if (n == NULL)
        return;
    tree_walk(n->left, visit);
    visit(n);
    tree_walk(n->right, visit);
}
```

`malloc(sizeof *root)` sizes the allocation from the pointer's own type, so it stays correct if the type is renamed. No cast is needed on the result: `void *` converts to any object pointer implicitly in C.

If keys arrive already sorted, a plain binary tree degenerates into a long chain and loses its speed. Self-balancing variants (AVL, red-black) fix that at the cost of more code.

## 6.6 Table Lookup

A **hash table** maps keys to values in (on average) constant time. The idea: run the key through a hash function to get a bucket number, and keep a short linked list of entries in each bucket. Here's a table counting how often each word occurs, using separate chaining and the FNV-1a hash:

```c
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define NBUCKETS 4093           /* a prime spreads keys more evenly */

struct entry {
    char *word;
    long count;
    struct entry *next;
};

static struct entry *buckets[NBUCKETS];

/* fnv1a: 32-bit FNV-1a hash of s */
static uint32_t fnv1a(const char *s)
{
    uint32_t h = 2166136261u;
    for (; *s; s++) {
        h ^= (unsigned char)*s;
        h *= 16777619u;
    }
    return h;
}

/* count_word: increment word's count, adding it if new; return the entry or NULL */
struct entry *count_word(const char *word)
{
    struct entry **slot = &buckets[fnv1a(word) % NBUCKETS];

    for (struct entry *e = *slot; e != NULL; e = e->next)
        if (strcmp(e->word, word) == 0) {
            e->count++;
            return e;
        }

    struct entry *e = malloc(sizeof *e);
    size_t len = strlen(word) + 1;
    if (e == NULL || (e->word = malloc(len)) == NULL) {
        free(e);
        return NULL;
    }
    memcpy(e->word, word, len);
    e->count = 1;
    e->next = *slot;            /* push onto the front of the chain */
    *slot = e;
    return e;
}
```

The loop `for (e = head; e != NULL; e = e->next)` is the standard way to traverse a linked list. Unsigned arithmetic in the hash wraps around harmlessly, so there's no overflow concern.

A production table would also grow `NBUCKETS` when chains get long, and provide removal and iteration.

## 6.7 Typedef

`typedef` gives a new name to an existing type:

```c
typedef unsigned char byte;
typedef struct vec2 Vec2;
typedef struct entry *EntryPtr;

byte buf[512];
Vec2 origin = { 0, 0 };
```

Syntactically, the new name stands where a variable name would in an ordinary declaration. A typedef does **not** create a distinct type; `Vec2` and `struct vec2` are interchangeable.

It can also be combined with the structure definition:

```c
typedef struct node {
    int key;
    struct node *left, *right;   /* the typedef name isn't available yet inside */
} Node;
```

Typedefs are most valuable in two situations:

1. **Hiding platform details.** If a type's best representation varies by machine, code written in terms of a typedef only needs the typedef changed. [`size_t`](/stddef/type.size_t/), `uint32_t` and [`time_t`](/time/type.time_t/) are library typedefs doing exactly this.
2. **Taming complex types**, especially function pointers:

```c
typedef int (*compare_fn)(const void *, const void *);
typedef void (*callback_fn)(void *userdata, int event);

void sort_records(struct record *r, size_t n, compare_fn cmp);
```

Opinions differ about typedef'ing plain structs. Some codebases (the Linux kernel, for one) prefer to always write `struct name` so it's obvious a value is a structure; others typedef everything. Pick one convention per project.

## 6.8 Unions

A **union** looks like a structure, but all its members share the same storage. It's large enough for its biggest member, and holds only one of them at a time:

```c
union number {
    long i;
    double d;
};
```

Reading a member other than the one most recently written is generally not meaningful (C does allow it as a way to reinterpret bytes, but the result depends on the platform). So a union almost always travels with a **tag** recording which member is valid. Together they form a *tagged union*, the standard way to represent a value that may be one of several kinds, as in a JSON parser or an interpreter:

```c
enum json_kind { J_NULL, J_BOOL, J_NUMBER, J_STRING };

struct json_value {
    enum json_kind kind;
    union {
        bool b;
        double n;
        char *s;
    };              /* anonymous union (C11): members accessed directly */
};

void json_print(const struct json_value *v)
{
    switch (v->kind) {
    case J_NULL:   fputs("null", stdout); break;
    case J_BOOL:   fputs(v->b ? "true" : "false", stdout); break;
    case J_NUMBER: printf("%g", v->n); break;
    case J_STRING: printf("\"%s\"", v->s); break;
    }
}
```

Unions are accessed with `.` and `->` just like structures. An initializer sets the first member, unless you name another with a designator: `union number x = { .d = 2.5 };`.

## 6.9 Bit-fields

Sometimes you need to pack several small values into one word, for instance flags in a tight data structure. The portable way is masks and the bitwise operators:

```c
enum {
    PERM_READ  = 1u << 0,
    PERM_WRITE = 1u << 1,
    PERM_EXEC  = 1u << 2,
};

unsigned perms = PERM_READ | PERM_WRITE;
perms &= ~PERM_WRITE;                       /* revoke write */
bool can_run = (perms & PERM_EXEC) != 0;
```

C also lets a structure member be declared with an explicit width in bits:

```c
struct cell_flags {
    unsigned visible  : 1;
    unsigned flagged  : 1;
    unsigned adjacent : 4;   /* 0-15: enough for a count of 0-8 */
};

struct cell_flags c = {0};
c.visible = 1;
c.adjacent = 3;
```

Such **bit-fields** read nicely, but most details of their layout are implementation-defined: the order bits are allocated within a word, whether a field can straddle a word boundary, even whether a plain `int` field is signed. Use them for in-memory bookkeeping, not to match an external format such as a network header or hardware register; for those, use masks and shifts on fixed-width integers. Bit-fields have no address, so `&c.visible` is an error.
