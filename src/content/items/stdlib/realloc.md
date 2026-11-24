---
name: realloc
kind: fn
header: stdlib
summary: Changes the size of a previously allocated block, moving it if needed.
signature: "void *realloc(void *ptr, size_t newsize);"
source: https://sourceware.org/glibc/manual/latest/html_node/Changing-Block-Size.html
---

Changes the size of the block whose address is `ptr` to `newsize`.

Since the space after the end of the block may be in use, `realloc` may copy the block to a new address. If it moves, the old contents are copied over. **Always use the returned pointer.**

## Return value

The new address of the block.

- If `ptr` is null, behaves like `malloc(newsize)`.
- If `realloc` cannot satisfy the request, it returns `NULL`, sets `errno`, and **leaves the original block undisturbed**.

<div class="warning">

**GNU behavior:** with a non-null `ptr` and a `newsize` of zero, glibc frees the block and returns `NULL`. This is not portable — C23 makes a zero size undefined behavior.

</div>

## Alignment

Any non-null result has the same alignment guarantees as `malloc` for the same size. Special alignment obtained from [`aligned_alloc`](../fn.aligned_alloc/) is **lost** after `realloc`.

## Examples

Never assign the result straight back to `ptr`; on failure you would leak the original block:

```c
int *tmp = realloc(buf, new_len * sizeof *buf);
if (tmp == NULL) {
    free(buf);
    return -1;
}
buf = tmp;
```
