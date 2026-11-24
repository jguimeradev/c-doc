---
name: "qsort"
kind: fn
header: stdlib
summary: "Sorts an array into ascending order using a comparison function."
signature: "void qsort(void *base, size_t n, size_t size,\n           int (*cmp)(const void *, const void *));"
source: https://sourceware.org/glibc/manual/latest/html_node/Array-Sort-Function.html
---

Sorts `base[0]…base[n-1]`, each `size` bytes, so that `cmp` reports them in non-decreasing order. The sort is **not** guaranteed to be stable. Despite its name, the algorithm isn't required to be quicksort.

`cmp` receives pointers to two elements. Avoid `return x - y;` for integers: it can overflow.

```c
static int by_name(const void *a, const void *b)
{
    const char *const *x = a, *const *y = b;
    return strcmp(*x, *y);
}

const char *words[] = {"pear", "apple", "fig"};
qsort(words, 3, sizeof words[0], by_name);
```
