---
name: "rand"
kind: fn
header: stdlib
summary: "Returns a pseudo-random integer in the range 0 to RAND_MAX."
signature: "int rand(void);"
source: https://sourceware.org/glibc/manual/latest/html_node/ISO-Random.html
---

Successive calls return a sequence determined by the seed set with [`srand`](../fn.srand/); without a call to `srand`, the seed is 1.

The standard's sample implementation is a simple linear congruential generator:

```c
static unsigned long next = 1;

int my_rand(void)   /* RAND_MAX assumed to be 32767 */
{
    next = next * 1103515245 + 12345;
    return (unsigned)(next / 65536) % 32768;
}

void my_srand(unsigned seed) { next = seed; }
```

<div class="warning">

`rand` is fine for simple simulations and games but **not** for anything security-related. Also, `rand() % n` is slightly biased when `n` doesn't divide `RAND_MAX + 1`.

</div>
