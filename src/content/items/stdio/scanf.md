---
name: "scanf"
kind: fn
header: stdio
summary: "Reads formatted input from stdin."
signature: "int scanf(const char *format, ...);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Input-Functions.html
---

Reads characters from `stdin`, interprets them according to `format`, and stores the results through the remaining arguments, **each of which must be a pointer**.

## Return value

The number of input items successfully converted and assigned, which can be fewer than requested (or zero) if input doesn't match. Returns [`EOF`](../macro.EOF/) if end of file or an error occurs before the first conversion.

## Format

White space in the format matches any amount of white space in the input. Ordinary characters must match exactly. Conversion specifications begin with `%`:

| Spec | Argument | Matches |
|---|---|---|
| `%d` | `int *` | decimal integer |
| `%i` | `int *` | integer in decimal, octal (`0…`) or hex (`0x…`) |
| `%u` `%o` `%x` | `unsigned *` | unsigned decimal / octal / hex |
| `%f` `%e` `%g` | `float *` | floating-point number |
| `%lf` | `double *` | floating-point number (note the `l`) |
| `%c` | `char *` | characters (default 1), **no** white-space skipping |
| `%s` | `char *` | a word of non-white-space characters |
| `%[…]` | `char *` | the longest string of characters from a set |
| `%n` | `int *` | stores characters read so far; converts nothing |
| `%%` | — | a literal `%` |

`h`, `l` and `L` modify the size: `%ld` for `long *`, `%hd` for `short *`, `%Lf` for `long double *`. A `*` after `%` reads the field but doesn't store it.

<div class="warning">

Always give `%s` and `%[` a maximum width (`%63s` for a 64-byte array), or input can overflow the buffer. For interactive input, reading a line with [`fgets`](../fn.fgets/) and parsing it with [`sscanf`](../fn.sscanf/) is far easier to make robust.

</div>

## Examples

```c
int day, year;
char month[16];
if (scanf("%d %15s %d", &day, month, &year) == 3)
    printf("%s %d, %d\n", month, day, year);
```
