---
chapter: structures
summary: Vector math, linked lists, hash tables, tagged unions, trees and struct layout.
---

## Exercise 6-1 · Vector math <span class="diff easy">easy</span>

Add `vec2_dot`, `vec2_length` and `vec2_normalize` to the `struct vec2` functions from [section 6.2](/book/structures/#62-structures-and-functions). Then write `vec2_reflect(v, n)`, which reflects velocity `v` off a surface with unit normal `n`: r = v − 2(v·n)n.

<details class="solution"><summary>Solution</summary>

```c
#include <math.h>

struct vec2 { double x, y; };

double vec2_dot(struct vec2 a, struct vec2 b)
{
    return a.x * b.x + a.y * b.y;
}

double vec2_length(struct vec2 v)
{
    return sqrt(vec2_dot(v, v));
}

struct vec2 vec2_normalize(struct vec2 v)
{
    double len = vec2_length(v);
    return len > 0 ? (struct vec2){ v.x / len, v.y / len } : v;
}

struct vec2 vec2_reflect(struct vec2 v, struct vec2 n)
{
    double k = 2 * vec2_dot(v, n);
    return (struct vec2){ v.x - k * n.x, v.y - k * n.y };
}
```

A ball moving `{3, -4}` that hits a floor with normal `{0, 1}` bounces to `{3, 4}`. Use [`hypot`](/math/)`(v.x, v.y)` for the length if components might be very large or small: it avoids overflow in the intermediate squares.

</details>

## Exercise 6-2 · Removing from a list <span class="diff medium">medium</span>

Add `int task_remove(struct task **head, const char *title)` to the to-do list from [section 6.5](/book/structures/#65-self-referential-structures). It removes and frees the first task with that title and returns 1, or returns 0 if there is none.

<details class="hint"><summary>Hint</summary>

Use the same pointer-to-pointer technique as `task_insert`: walk `head` along the `next` links until `*head` is the node to delete, then make `*head` skip over it. That handles deleting the first node with no special case.

</details>

<details class="solution"><summary>Solution</summary>

```c
int task_remove(struct task **head, const char *title)
{
    for (; *head != NULL; head = &(*head)->next) {
        struct task *t = *head;
        if (strcmp(t->title, title) == 0) {
            *head = t->next;    /* unlink */
            free(t->title);
            free(t);
            return 1;
        }
    }
    return 0;
}
```

</details>

## Exercise 6-3 · The most frequent words <span class="diff medium">medium</span>

Using the hash table from [section 6.6](/book/structures/#66-table-lookup), write a program that reads words from standard input and prints the 20 most frequent, with counts. Lower-case words before counting them.

<details class="hint"><summary>Hint</summary>

Read words with `scanf("%99s", buf)` and lower-case them. After counting, walk all buckets and copy the entry *pointers* into an array, `qsort` it by descending count, and print the first 20.

</details>

<details class="solution"><summary>Solution</summary>

Add to the hash table file:

```c
#include <ctype.h>
#include <stdio.h>

static int by_count_desc(const void *a, const void *b)
{
    const struct entry *x = *(struct entry *const *)a;
    const struct entry *y = *(struct entry *const *)b;
    if (x->count != y->count)
        return (y->count > x->count) - (y->count < x->count);
    return strcmp(x->word, y->word);          /* ties: alphabetical */
}

int main(void)
{
    char buf[100];
    size_t distinct = 0;

    while (scanf("%99s", buf) == 1) {
        for (char *p = buf; *p; p++)
            *p = tolower((unsigned char)*p);
        struct entry *e = count_word(buf);
        if (e == NULL)
            return 1;
        if (e->count == 1)
            distinct++;
    }

    struct entry **all = malloc(distinct * sizeof *all);
    size_t n = 0;
    if (all == NULL && distinct > 0)
        return 1;
    for (size_t b = 0; b < NBUCKETS; b++)
        for (struct entry *e = buckets[b]; e != NULL; e = e->next)
            all[n++] = e;

    qsort(all, n, sizeof *all, by_count_desc);
    for (size_t i = 0; i < n && i < 20; i++)
        printf("%7ld %s\n", all[i]->count, all[i]->word);
    free(all);
    return 0;
}
```

Sorting pointers instead of entries moves 8 bytes per swap no matter how large the entries are.

</details>

## Exercise 6-4 · JSON arrays <span class="diff medium">medium</span>

Add a `J_ARRAY` kind to `struct json_value` from [section 6.8](/book/structures/#68-unions), holding a length and a pointer to an array of values. Update `json_print` to print arrays recursively, like `[1, "two", null]`.

<details class="solution"><summary>Solution</summary>

```c
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

enum json_kind { J_NULL, J_BOOL, J_NUMBER, J_STRING, J_ARRAY };

struct json_value {
    enum json_kind kind;
    union {
        bool b;
        double n;
        char *s;
        struct {
            size_t len;
            struct json_value *items;
        } arr;
    };
};

void json_print(const struct json_value *v)
{
    switch (v->kind) {
    case J_NULL:   fputs("null", stdout); break;
    case J_BOOL:   fputs(v->b ? "true" : "false", stdout); break;
    case J_NUMBER: printf("%g", v->n); break;
    case J_STRING: printf("\"%s\"", v->s); break;
    case J_ARRAY:
        putchar('[');
        for (size_t i = 0; i < v->arr.len; i++) {
            if (i > 0)
                fputs(", ", stdout);
            json_print(&v->arr.items[i]);
        }
        putchar(']');
        break;
    }
}
```

The union is now as large as its largest member, the `arr` struct (16 bytes on 64-bit systems). Nesting arrays inside arrays works automatically, since each item is itself a `struct json_value`.

</details>

## Exercise 6-5 · Tree height <span class="diff medium">medium</span>

Write `int tree_height(const struct node *n)` and `void tree_free(struct node *n)` for the binary tree in [section 6.5](/book/structures/#65-self-referential-structures). Measure the height after inserting the keys 0–999 in order, and again in random order.

<details class="solution"><summary>Solution</summary>

```c
int tree_height(const struct node *n)
{
    if (n == NULL)
        return 0;
    int l = tree_height(n->left), r = tree_height(n->right);
    return 1 + (l > r ? l : r);
}

void tree_free(struct node *n)
{
    if (n == NULL)
        return;
    tree_free(n->left);      /* children first: n's fields are still valid */
    tree_free(n->right);
    free(n);
}
```

Sorted insertion gives height **1000**: every node is the right child of the previous one, so the tree is really a linked list. Random insertion typically gives a height around 20–25, close to the ideal of ⌈log₂ 1001⌉ = 10 multiplied by a small constant. That gap is why balanced trees exist.

</details>

## Exercise 6-6 · Shrinking a struct <span class="diff easy">easy</span>

Predict `sizeof` for this structure on a typical 64-bit system, then reorder its members to make it as small as possible and check with a program that also prints each member's [`offsetof`](/stddef/macro.offsetof/).

```c
struct record {
    char flag;
    double value;
    short id;
    int count;
    char tag;
};
```

<details class="solution"><summary>Solution</summary>

As written: `flag` at 0, 7 bytes padding, `value` at 8, `id` at 16, 2 bytes padding, `count` at 20, `tag` at 24, then 7 bytes of tail padding so arrays stay aligned: **32 bytes**.

Sorted by decreasing alignment:

```c
#include <stddef.h>
#include <stdio.h>

struct record {
    double value;   /* 0  */
    int count;      /* 8  */
    short id;       /* 12 */
    char flag;      /* 14 */
    char tag;       /* 15 */
};                  /* 16 bytes */

int main(void)
{
    printf("size %zu\n", sizeof(struct record));
    printf("value %zu, count %zu, id %zu, flag %zu, tag %zu\n",
           offsetof(struct record, value), offsetof(struct record, count),
           offsetof(struct record, id), offsetof(struct record, flag),
           offsetof(struct record, tag));
    return 0;
}
```

Half the memory, for free. GCC's `-Wpadded` reports every place padding is inserted.

</details>
