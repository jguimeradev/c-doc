---
title: minishell — a UNIX command interpreter
order: 7
summary: A small shell with built-ins, pipelines, I/O redirection and signal handling, built on fork, exec and pipe.
level: advanced
chapters: [pointers-arrays, input-output, unix-interface]
skills: [fork/exec/wait, pipes, dup2, signals, tokenizing]
platform: POSIX (Linux, macOS, BSD, WSL)
---

## Overview

A shell is a surprisingly small program: read a line, split it into words, start the programs it names, wire their inputs and outputs together, and wait for them. Writing one teaches how processes really work on UNIX.

```console
$ ./msh
msh$ echo hello world
hello world
msh$ ls -1 | grep '\.c$' | wc -l
7
msh$ sort < names.txt > sorted.txt
msh$ cd /tmp
msh$ pwd
/tmp
msh$ false
msh$ echo $?
1
msh$ sleep 10
^C
msh$ exit
```

## What you'll practice

- tokenizing with quotes (`'single'`, `"double"`, `\` escapes);
- building `argv` arrays (`char **`, null-terminated) for `execvp`;
- process creation: `fork`, `execvp`, `waitpid`, exit statuses;
- file descriptors: `pipe`, `dup2`, `open`, `close`, and why forgetting to close one makes a pipeline hang forever;
- signals: the shell must ignore Ctrl-C while children receive it;
- built-in commands that must run inside the shell (`cd`, `exit`).

## Specification

- Prompt `msh$ ` when input is a terminal (`isatty(STDIN_FILENO)`), no prompt otherwise, so scripts work: `./msh < script.sh`.
- Words are separated by blanks. Single quotes preserve everything literally; double quotes allow `\"` and `\\`; outside quotes, `\` escapes the next character.
- `|` connects commands; `<`, `>` and `>>` redirect the input or output of the command they follow.
- Built-ins: `cd [DIR]` (default `$HOME`), `exit [N]`, `pwd`.
- `$?` expands to the last pipeline's exit status (that of its last command).
- Ctrl-C interrupts the running command but not the shell. At the prompt, it prints a new prompt.
- Ctrl-D (end of input) exits.

## Milestones

### 1. Read, split, run

Read lines with [`fgets`](/stdio/fn.fgets/). Split on spaces into a `char *argv[64]` (no quotes yet). `fork`; in the child, `execvp(argv[0], argv)` and, if it returns, print an error and `_exit(127)`; in the parent, `waitpid` and record the status with `WIFEXITED`/`WEXITSTATUS`.

### 2. Built-ins

Check for `cd`, `exit` and `pwd` **before** forking. `cd` must run in the shell itself: a child changing its own directory has no effect on the parent.

### 3. Redirection

While splitting, recognize `<`, `>` and `>>` followed by a file name. In the child, before `execvp`, `open` the file and `dup2` it onto 0 or 1, then `close` the original descriptor.

### 4. Pipelines

Split the line at `|` into commands. For N commands, create N−1 pipes. Fork each command; in each child, `dup2` the right pipe ends onto stdin/stdout, then **close every pipe descriptor** before `execvp`. The parent closes all pipe ends too, then waits for every child.

<details class="hint"><summary>Hint: why pipelines hang</summary>

A reader only sees end-of-file when *every* copy of the pipe's write end is closed. If the parent or any sibling still holds the write end open, `wc` in `ls | wc` waits forever. List every open pipe descriptor and make sure each process closes all the ones it doesn't use.

</details>

### 5. Quotes and $?

Replace the space-splitter with a character-by-character tokenizer with states (normal, in single quotes, in double quotes, after backslash). Expand `$?` outside single quotes.

### 6. Signals

In the shell, ignore `SIGINT` (with `sigaction`). In each child, restore the default action before `exec`. At the prompt, Ctrl-C should cancel the current line; handling it cleanly with `fgets` is fiddly, and one approach uses `sigsetjmp`/`siglongjmp`.

## Starter code

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

#define MAXARGS 64

static int last_status = 0;

static int split(char *line, char *argv[], int max)
{
    int n = 0;
    for (char *tok = strtok(line, " \t\n"); tok && n < max - 1; tok = strtok(NULL, " \t\n"))
        argv[n++] = tok;
    argv[n] = NULL;
    return n;
}

static void run(char *argv[])
{
    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return;
    }
    if (pid == 0) {
        execvp(argv[0], argv);
        perror(argv[0]);
        _exit(127);
    }
    int status;
    if (waitpid(pid, &status, 0) < 0) {
        perror("waitpid");
        return;
    }
    last_status = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
}

int main(void)
{
    char line[1024];
    char *argv[MAXARGS];
    int interactive = isatty(STDIN_FILENO);

    for (;;) {
        if (interactive) {
            fputs("msh$ ", stdout);
            fflush(stdout);
        }
        if (fgets(line, sizeof line, stdin) == NULL)
            break;
        if (split(line, argv, MAXARGS) == 0)
            continue;
        if (strcmp(argv[0], "exit") == 0)
            break;
        /* TODO: cd, pwd, redirection, pipelines */
        run(argv);
    }
    return last_status;
}
```

The child uses `_exit` rather than `exit` after a failed `exec`: `exit` would flush stdio buffers that the child inherited from the parent, printing some output twice.

## Testing

Compare against a real shell. Put commands in a file and run it through both:

```sh
cat > t.sh <<'EOF'
echo one two
echo 'single  quoted' "double \"quoted\""
printf 'b\na\nc\n' | sort | head -2
echo hi > out.txt
cat < out.txt
echo again >> out.txt
wc -l < out.txt
false
echo $?
EOF
diff <(./msh < t.sh) <(sh < t.sh) && echo PASS
```

Also check for descriptor leaks: run `ls -l /proc/self/fd` (Linux) or `lsof -p $$` from inside your shell after a pipeline; only 0, 1 and 2 should be open.

## Stretch goals

- Background jobs with `&`, and `jobs`/`fg` built-ins (process groups, `tcsetpgrp`).
- Environment variables: `$HOME`, `VAR=value` assignments, `export`.
- `&&`, `||` and `;` between pipelines.
- Line editing and history (a small raw-mode editor, or link against `readline`).
- Glob expansion of `*.c` with POSIX `glob`.
