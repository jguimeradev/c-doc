---
title: life — Conway's Game of Life
order: 3
summary: Simulate the Game of Life in the terminal, with wrap-around boards, pattern files and animation.
level: beginner
chapters: [control-flow, functions-program-structure, pointers-arrays]
skills: [2-D arrays, double buffering, file parsing, terminal escape codes]
---

## Overview

The Game of Life is a grid of cells, each alive or dead. Every generation, all cells update at once:

- a live cell with 2 or 3 live neighbors survives;
- a dead cell with exactly 3 live neighbors becomes alive;
- every other cell is dead in the next generation.

From those rules come gliders that walk across the board, oscillators, and patterns that grow forever. You'll animate it in a terminal:

```console
$ ./life -g 200 -d 50 patterns/glider-gun.cells
```

## What you'll practice

- two-dimensional arrays and passing them to functions;
- computing the next state into a second buffer, then swapping (double buffering);
- modular arithmetic for wrap-around edges;
- parsing a simple text file format;
- ANSI escape codes to redraw the screen;
- splitting a program into a module (`board.c`/`board.h`) and a driver.

## Specification

```text
life [-w WIDTH] [-h HEIGHT] [-g GENERATIONS] [-d DELAY_MS] [PATTERN_FILE]
```

- Default board 60×30, 100 generations, 100 ms between frames.
- Without a pattern file, start from a random board with about 25% live cells.
- The board **wraps**: the right edge neighbors the left, the top neighbors the bottom.
- Pattern files use the plaintext `.cells` format: lines starting with `!` are comments, `O` is alive, `.` is dead. Place the pattern centered on the board.
- Draw live cells as `█` (or `#`), dead cells as spaces, with a status line showing generation and population.

## Milestones

### 1. Board and display

Represent the board as `unsigned char cells[H][W]`. Write `void board_print(...)`. Seed a glider by hand and print one frame.

### 2. One step

Write `int neighbors(board, r, c)` using `(r + dr + H) % H` and `(c + dc + W) % W` to wrap. Write `step(cur, next)` that applies the rules from `cur` into `next`. **Don't update in place:** each cell's new state must depend only on the old generation.

### 3. Animation

Loop over generations: print, step, swap the two buffers (swap pointers, don't copy arrays), sleep. Clear and redraw with `printf("\x1b[H\x1b[2J")`. Use `nanosleep` on POSIX.

### 4. Pattern files

Read the file line by line with [`fgets`](/stdio/fn.fgets/), skip `!` lines, compute the pattern's width and height, then place it in the center.

### 5. Flags and variable size

Make width and height command-line options. With C99 VLAs or a single `malloc`'d block of `W * H` bytes indexed as `cells[r * W + c]`, the board size can be chosen at run time.

## Starter code

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define W 60
#define H 30

typedef unsigned char Board[H][W];

static int neighbors(Board b, int r, int c)
{
    int n = 0;
    for (int dr = -1; dr <= 1; dr++)
        for (int dc = -1; dc <= 1; dc++)
            if (dr != 0 || dc != 0)
                n += b[(r + dr + H) % H][(c + dc + W) % W];
    return n;
}

static void step(Board cur, Board next)
{
    for (int r = 0; r < H; r++)
        for (int c = 0; c < W; c++) {
            /* TODO: apply the rules using neighbors(cur, r, c) */
            next[r][c] = cur[r][c];
        }
}

static void print(Board b, int gen)
{
    printf("\x1b[H\x1b[2J");
    for (int r = 0; r < H; r++) {
        for (int c = 0; c < W; c++)
            putchar(b[r][c] ? '#' : ' ');
        putchar('\n');
    }
    printf("generation %d\n", gen);
}

int main(void)
{
    static Board a, b;
    unsigned char (*cur)[W] = a, (*next)[W] = b;

    /* a glider */
    cur[1][2] = cur[2][3] = cur[3][1] = cur[3][2] = cur[3][3] = 1;

    for (int gen = 0; gen < 100; gen++) {
        print(cur, gen);
        step(cur, next);
        unsigned char (*tmp)[W] = cur;    /* swap buffers */
        cur = next;
        next = tmp;
        /* TODO: sleep between frames */
    }
    return 0;
}
```

`unsigned char (*cur)[W]` is a pointer to a row of `W` cells. That's what a 2-D array decays to, so `cur[r][c]` works and swapping two such pointers swaps the boards without copying.

## Testing

Known patterns make excellent tests, because their behavior is documented:

| Pattern | Expected |
|---|---|
| blinker (3 in a row) | period 2: alternates horizontal/vertical |
| block (2×2) | never changes |
| glider | same shape every 4 generations, moved 1 cell diagonally |
| R-pentomino | on an unbounded board, stabilizes after 1103 generations (a small wrapping board will differ) |

Write a non-animated `--test` mode that runs a pattern for `N` generations and compares the final board to an expected one.

## Stretch goals

- Count population per generation and detect when the board stops changing or enters a cycle (keep hashes of recent boards).
- Support the RLE pattern format used by most online pattern collections.
- Use an "infinite" board: store only live cells in a hash set ([section 6.6](/book/structures/#66-table-lookup)) keyed by `(r, c)`.
- Use two bits per cell and bit-parallel tricks to update 64 cells per operation.
