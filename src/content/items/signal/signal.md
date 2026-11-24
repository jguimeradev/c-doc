---
name: "signal"
kind: fn
header: signal
summary: "Sets how a signal is handled; returns the previous handler."
signature: "void (*signal(int sig, void (*handler)(int)))(int);"
source: https://sourceware.org/glibc/manual/latest/html_node/Basic-Signal-Handling.html
---

The declaration is easier to read with a typedef:

```c
typedef void (*sighandler_t)(int);
sighandler_t signal(int sig, sighandler_t handler);
```

`handler` is [`SIG_DFL`](../macro.SIG_DFL/) (default behavior), `SIG_IGN` (ignore), or a function to call with the signal number. Returns the previous handler, or `SIG_ERR` on error.

## Examples

```c
#include <signal.h>

void do_work(void);      /* your program's work... */
void save_state(void);   /* ...and cleanup */

static volatile sig_atomic_t interrupted = 0;

static void on_sigint(int sig)
{
    (void)sig;
    interrupted = 1;   /* only set a flag: almost nothing else is safe here */
}

int main(void)
{
    signal(SIGINT, on_sigint);
    while (!interrupted)
        do_work();
    save_state();
}
```

<div class="warning">

A handler may only portably assign to a `volatile sig_atomic_t` object, call `_Exit`/`abort`/`signal`, or return. Calling `printf` or `malloc` from a handler is unsafe. On POSIX systems, prefer `sigaction`, whose semantics are specified precisely.

</div>
