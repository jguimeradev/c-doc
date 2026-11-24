---
name: "bsearch"
kind: fn
header: stdlib
summary: "Binary search of a sorted array."
signature: "void *bsearch(const void *key, const void *base, size_t n, size_t size,\n              int (*cmp)(const void *keyval, const void *datum));"
source: https://sourceware.org/glibc/manual/latest/html_node/Array-Search-Function.html
---

Searches `base[0]…base[n-1]` (each `size` bytes, sorted in increasing order according to `cmp`) for an element matching `*key`. `cmp` returns negative, zero or positive as the key is less than, equal to or greater than the element.

Returns a pointer to a matching element, or `NULL` if none.

```c
static int cmp_int(const void *a, const void *b)
{
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);
}

int primes[] = {2, 3, 5, 7, 11, 13};
int key = 7;
int *p = bsearch(&key, primes, 6, sizeof primes[0], cmp_int);
```
