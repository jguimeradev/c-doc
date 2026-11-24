---
chapter: pointers-arrays
summary: Pointer walking, splitting strings, arenas, circular buffers and declarations.
---

## Exercise 5-1 · Reverse with pointers <span class="diff easy">easy</span>

Write `void swap_ints(int *a, int *b)` and use it in `void reverse_ints(int *a, size_t n)`, which reverses an array in place using two pointers that move toward each other. No indexing allowed.

<details class="solution"><summary>Solution</summary>

```c
#include <stddef.h>

void swap_ints(int *a, int *b)
{
    int t = *a;
    *a = *b;
    *b = t;
}

void reverse_ints(int *a, size_t n)
{
    if (n < 2)
        return;
    for (int *lo = a, *hi = a + n - 1; lo < hi; lo++, hi--)
        swap_ints(lo, hi);
}
```

The `n < 2` check matters: for `n == 0`, `a + n - 1` would point before the array, which is undefined even if never dereferenced.

</details>

## Exercise 5-2 · Splitting a line <span class="diff medium">medium</span>

Write `int split(char *s, char sep, char *fields[], int max)`. It stores pointers to up to `max` fields of `s` in `fields`, replacing each separator with `'\0'`, and returns the number of fields. Unlike [`strtok`](/string/fn.strtok/), empty fields count: `"a,,b"` has three fields.

<details class="hint"><summary>Hint</summary>

The first field starts at `s`. Walk the string; every time you hit `sep`, overwrite it with `'\0'` and record that the next field starts at the following character. [`strchr`](/string/fn.strchr/) makes the walk short.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <string.h>

int split(char *s, char sep, char *fields[], int max)
{
    int n = 0;
    if (max <= 0)
        return 0;
    fields[n++] = s;
    while (n < max && (s = strchr(s, sep)) != NULL) {
        *s++ = '\0';
        fields[n++] = s;
    }
    return n;
}
```

```c
char line[] = "id,,name,age";
char *f[8];
int n = split(line, ',', f, 8);    /* n == 4: "id", "", "name", "age" */
```

If there are more than `max` fields, the last stored field contains the rest of the line, separators included, which is often exactly what you want (compare `split -n` in many languages).

</details>

## Exercise 5-3 · arena_strdup <span class="diff easy">easy</span>

Add `char *arena_strdup(struct arena *a, const char *s)` to the arena allocator from [section 5.4](/book/pointers-arrays/#54-address-arithmetic).

<details class="solution"><summary>Solution</summary>

```c
#include <string.h>

char *arena_strdup(struct arena *a, const char *s)
{
    size_t len = strlen(s) + 1;
    char *p = arena_alloc(a, len);
    if (p != NULL)
        memcpy(p, s, len);
    return p;
}
```

Strings don't need alignment, so a refinement would be an `arena_alloc_unaligned` that skips the padding, packing strings tightly.

</details>

## Exercise 5-4 · Counting words <span class="diff medium">medium</span>

Change the word-sorting program from [section 5.6](/book/pointers-arrays/#56-pointer-arrays-pointers-to-pointers) so that it prints each distinct word once, preceded by how many times it occurred.

<details class="hint"><summary>Hint</summary>

After sorting, equal words are adjacent. Walk the array counting a run of equal words, and print when the run ends.

</details>

<details class="solution"><summary>Solution</summary>

Replace the printing loop with:

```c
for (size_t i = 0; i < n; ) {
    size_t j = i + 1;
    while (j < n && strcmp(words[j], words[i]) == 0)
        j++;
    printf("%7zu %s\n", j - i, words[i]);
    i = j;
}
```

Piping the output through `sort -rn | head` gives the most common words, a classic UNIX pipeline.

</details>

## Exercise 5-5 · tail <span class="diff hard">hard</span>

Write `tail [-n COUNT]`, which prints the last `COUNT` lines of its input (default 10). Keep only `COUNT` lines in memory at once, in an array of `char *` used as a circular buffer.

<details class="hint"><summary>Hint</summary>

Allocate `char *ring[COUNT]`, all `NULL`. For the i-th line read, `free(ring[i % COUNT])` and store a fresh copy there. At the end, the oldest surviving line is at index `total % COUNT` if more than `COUNT` lines were read, otherwise at 0.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char *argv[])
{
    long count = 10;
    if (argc == 3 && strcmp(argv[1], "-n") == 0)
        count = strtol(argv[2], NULL, 10);
    else if (argc != 1) {
        fprintf(stderr, "usage: %s [-n COUNT]\n", argv[0]);
        return 2;
    }
    if (count <= 0)
        return 0;

    char **ring = calloc((size_t)count, sizeof *ring);
    char line[4096];
    long total = 0;
    if (ring == NULL) {
        perror("calloc");
        return 1;
    }

    while (fgets(line, sizeof line, stdin) != NULL) {
        long slot = total % count;
        free(ring[slot]);
        ring[slot] = malloc(strlen(line) + 1);
        if (ring[slot] == NULL) {
            perror("malloc");
            return 1;
        }
        strcpy(ring[slot], line);
        total++;
    }

    long kept = total < count ? total : count;
    long start = total < count ? 0 : total % count;
    for (long i = 0; i < kept; i++)
        fputs(ring[(start + i) % count], stdout);

    for (long i = 0; i < count; i++)
        free(ring[i]);
    free(ring);
    return 0;
}
```

(Lines longer than 4095 characters are split into pieces, each counted as a line. Exercise 8-3's `reader_getline`, or POSIX `getline`, fixes that.)

</details>

## Exercise 5-6 · Reading and writing declarations <span class="diff medium">medium</span>

Write C declarations for:

1. `p`: a pointer to a function taking no arguments and returning a pointer to `char`;
2. `t`: an array of 10 pointers to arrays of 5 `int`s;
3. `f`: a function taking an `int` and returning a pointer to a function that takes a `double` and returns `double`.

Then rewrite the third one using a `typedef`.

<details class="hint"><summary>Hint</summary>

Build from the name outwards. For (1): `p` is a pointer, `(*p)`; to a function, `(*p)(void)`; returning a pointer to `char`, `char *(*p)(void)`.

</details>

<details class="solution"><summary>Solution</summary>

```c
char *(*p)(void);
int (*t[10])[5];
double (*f(int))(double);

/* with a typedef */
typedef double (*unary_fn)(double);
unary_fn f(int);
```

Check (2) by reading it back: `t` is an array of 10 (`t[10]`), of pointers (`*`), to arrays of 5 (`[5]`) of `int`. The parentheses around `*t[10]` are required; without them, `int *t[10][5]` would be a 10×5 array of pointers.

</details>
