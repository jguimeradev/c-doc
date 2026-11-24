---
name: "memcmp"
kind: fn
header: string
summary: "Compares the first n bytes of two memory regions."
signature: "int memcmp(const void *cs, const void *ct, size_t n);"
source: https://sourceware.org/glibc/manual/latest/html_node/String_002fArray-Comparison.html
---

Returns `<0`, `0` or `>0` like [`strcmp`](../fn.strcmp/), comparing bytes as `unsigned char`. It does not stop at null bytes.

<div class="warning">

Don't use `memcmp` to compare structs: padding bytes have unspecified values.

</div>
