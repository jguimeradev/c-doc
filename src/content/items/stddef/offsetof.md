---
name: "offsetof"
kind: macro
header: stddef
summary: "Byte offset of a member within a structure type."
signature: "size_t offsetof(type, member);"
source: https://sourceware.org/glibc/manual/latest/html_node/Structure-Measurement.html
---

```c
struct header { char tag; int length; };
size_t off = offsetof(struct header, length);   /* typically 4 */
```

Useful for generic container code and serialization. The difference from the sum of the preceding members' sizes is padding.
