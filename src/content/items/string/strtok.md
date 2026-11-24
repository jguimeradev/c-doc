---
name: "strtok"
kind: fn
header: string
summary: "Splits a string into tokens separated by characters from ct."
signature: "char *strtok(char *restrict s, const char *restrict ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Finding-Tokens-in-a-String.html
---

The first call passes the string `s`; later calls pass `NULL` to continue where the previous one stopped. Each call returns the next token (writing a `'\0'` over the delimiter that ends it), or `NULL` when there are no more. `ct` may differ between calls.

```c
char line[] = "alpha, beta,,gamma";
for (char *tok = strtok(line, ", "); tok; tok = strtok(NULL, ", "))
    puts(tok);           /* alpha / beta / gamma */
```

<div class="warning">

`strtok` modifies its argument (so it can't take a string literal), keeps hidden state (so it isn't reentrant or thread-safe), and treats runs of delimiters as one. POSIX `strtok_r` fixes the state problem.

</div>
