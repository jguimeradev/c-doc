---
chapter: control-flow
summary: switch, sorting, loops with do-while, nested loops and binary search.
---

## Exercise 3-1 · Grades with switch <span class="diff easy">easy</span>

Rewrite `grade` from [section 3.3](/book/control-flow/#33-else-if) using a `switch` on `score / 10`. Scores range from 0 to 100.

<details class="hint"><summary>Hint</summary>

`score / 10` is 10 for a perfect score and 9 for 90–99; both are an A, so stack `case 10:` and `case 9:`. Everything below 6 goes to `default`.

</details>

<details class="solution"><summary>Solution</summary>

```c
const char *grade(int score)
{
    switch (score / 10) {
    case 10:
    case 9:
        return "A";
    case 8:
        return "B";
    case 7:
        return "C";
    case 6:
        return "D";
    default:
        return "F";
    }
}
```

Each case ends in `return`, so no `break` is needed. This version is only correct because the grade boundaries fall on multiples of 10; the `else if` chain from the chapter is more flexible.

</details>

## Exercise 3-2 · Counting vowels <span class="diff easy">easy</span>

Write `int count_vowels(const char *s)` using a `switch` with stacked `case` labels for `a e i o u`, in both upper and lower case.

<details class="solution"><summary>Solution</summary>

```c
int count_vowels(const char *s)
{
    int n = 0;
    for (; *s != '\0'; s++) {
        switch (*s) {
        case 'a': case 'e': case 'i': case 'o': case 'u':
        case 'A': case 'E': case 'I': case 'O': case 'U':
            n++;
            break;
        default:
            break;
        }
    }
    return n;
}
```

</details>

## Exercise 3-3 · Selection sort and counting comparisons <span class="diff medium">medium</span>

Implement selection sort: repeatedly find the smallest remaining element and swap it into place. Instrument both it and the insertion sort from [section 3.5](/book/control-flow/#35-loops-while-and-for) to count comparisons, and compare them on already-sorted, reversed and random arrays of 1000 elements.

<details class="hint"><summary>Hint</summary>

Pass a `long *comparisons` to each sort and increment it next to every `<` or `>` between elements. Selection sort always does n(n−1)/2 comparisons; insertion sort's count depends on how sorted the input already is.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>
#include <stdlib.h>

void selection_sort(int a[], int n, long *cmp)
{
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++) {
            (*cmp)++;
            if (a[j] < a[min])
                min = j;
        }
        int t = a[i]; a[i] = a[min]; a[min] = t;
    }
}

void insertion_sort(int a[], int n, long *cmp)
{
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && (++*cmp, a[j] > key)) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

#define N 1000

static void fill(int a[], int kind)
{
    for (int i = 0; i < N; i++)
        a[i] = kind == 0 ? i : kind == 1 ? N - i : rand() % N;
}

int main(void)
{
    static const char *names[] = { "sorted", "reversed", "random" };
    int a[N];

    for (int kind = 0; kind < 3; kind++) {
        long sel = 0, ins = 0;
        fill(a, kind); selection_sort(a, N, &sel);
        fill(a, kind); insertion_sort(a, N, &ins);
        printf("%-9s selection %7ld   insertion %7ld\n", names[kind], sel, ins);
    }
    return 0;
}
```

Typical output:

```text
sorted    selection  499500   insertion     999
reversed  selection  499500   insertion  499500
random    selection  499500   insertion  ~250000
```

The comma operator in `(++*cmp, a[j] > key)` counts the comparison and then yields its result. Insertion sort is excellent on nearly-sorted data, which is why real-world sort implementations often use it for small runs.

</details>

## Exercise 3-4 · Any base <span class="diff medium">medium</span>

Write `void to_base(unsigned long n, int base, char *buf)` that writes the representation of `n` in any base from 2 to 36 into `buf`, using digits `0-9` then `a-z`. Use a `do-while` so that 0 produces `"0"`.

<details class="hint"><summary>Hint</summary>

Generate digits from least significant (`n % base`) to most, which leaves them reversed. Reverse the buffer at the end.

</details>

<details class="solution"><summary>Solution</summary>

```c
void to_base(unsigned long n, int base, char *buf)
{
    static const char digits[] = "0123456789abcdefghijklmnopqrstuvwxyz";
    int i = 0;

    do {
        buf[i++] = digits[n % (unsigned)base];
        n /= (unsigned)base;
    } while (n > 0);
    buf[i] = '\0';

    for (int lo = 0, hi = i - 1; lo < hi; lo++, hi--) {
        char t = buf[lo];
        buf[lo] = buf[hi];
        buf[hi] = t;
    }
}
```

`buf` must hold at least 65 bytes to cover a 64-bit value in base 2.

</details>

## Exercise 3-5 · A diamond <span class="diff easy">easy</span>

Read an odd number `n` and print a diamond of `*` that is `n` rows tall and `n` columns wide at its middle row. For `n = 5`:

```text
  *
 ***
*****
 ***
  *
```

<details class="hint"><summary>Hint</summary>

For row `r` (0-based), its distance from the middle is `d = abs(r - n/2)`. The row has `d` spaces then `n - 2*d` stars.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int n;
    if (scanf("%d", &n) != 1 || n < 1 || n % 2 == 0) {
        fputs("need a positive odd number\n", stderr);
        return 1;
    }
    for (int r = 0; r < n; r++) {
        int d = abs(r - n / 2);
        for (int i = 0; i < d; i++)
            putchar(' ');
        for (int i = 0; i < n - 2 * d; i++)
            putchar('*');
        putchar('\n');
    }
    return 0;
}
```

</details>

## Exercise 3-6 · The first occurrence <span class="diff hard">hard</span>

The binary search in [section 3.3](/book/control-flow/#33-else-if) returns *some* index of the target when it appears several times. Write `int lower_bound(const int a[], int n, int x)`, which returns the index of the **first** element that is ≥ `x` (or `n` if there is none). Use it to count how many times `x` occurs in a sorted array in O(log n) time.

<details class="hint"><summary>Hint</summary>

Keep a half-open range `[lo, hi)` that always contains the answer. If `a[mid] < x`, the answer is to the right of `mid`, so set `lo = mid + 1`; otherwise `mid` itself might be the answer, so set `hi = mid`. Stop when `lo == hi`. The count of `x` is `lower_bound(x + 1) - lower_bound(x)`.

</details>

<details class="solution"><summary>Solution</summary>

```c
int lower_bound(const int a[], int n, int x)
{
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x)
            lo = mid + 1;
        else
            hi = mid;
    }
    return lo;
}

int count_of(const int a[], int n, int x)
{
    return lower_bound(a, n, x + 1) - lower_bound(a, n, x);   /* assumes x < INT_MAX */
}
```

Every loop iteration strictly shrinks `[lo, hi)`, so it always terminates, and the invariant guarantees the result is right. Half-open ranges like this avoid most of the off-by-one errors that plague binary search.

</details>
