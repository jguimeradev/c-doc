// Example programs for the playground. Each one shows off a different view.

export interface Example {
  id: string;
  title: string;
  hint: string;
  stdin?: string;
  breakpoints?: number[];
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'hello',
    title: 'Hello, world',
    hint: 'Press Run, then compare each line with its color-matched assembly.',
    code: `#include <stdio.h>

int main(void)
{
    printf("hello, world\\n");
    return 0;
}
`,
  },
  {
    id: 'layout',
    title: 'Where things live in memory',
    hint: 'Run it and compare the printed addresses with the Memory tab: text, rodata, data, bss, heap and stack.',
    code: `#include <stdio.h>
#include <stdlib.h>

int initialized = 42;          /* .data   */
int zeroed[4];                 /* .bss    */
const char *greeting = "hi";   /* pointer in .data, characters in .rodata */

int main(void)
{
    static int calls = 0;      /* static local: also in .data */
    int local = 7;             /* stack */
    int *dynamic = malloc(sizeof *dynamic);   /* heap */
    *dynamic = 99;
    calls++;

    /* code (.text) lives at 0x401000: see the addresses in the Assembly pane */
    printf("rodata  \\"hi\\"        %p\\n", (void *)greeting);
    printf("data    initialized %p\\n", (void *)&initialized);
    printf("data    calls       %p\\n", (void *)&calls);
    printf("bss     zeroed      %p\\n", (void *)zeroed);
    printf("heap    *dynamic    %p\\n", (void *)dynamic);
    printf("stack   local       %p\\n", (void *)&local);

    free(dynamic);
    return 0;
}
`,
  },
  {
    id: 'factorial',
    title: 'Recursion: watch the stack grow',
    hint: 'Debug, then Step Into repeatedly. Each call adds a frame: return address, saved rbp and its own n.',
    breakpoints: [5],
    code: `#include <stdio.h>

int factorial(int n)
{
    if (n <= 1)
        return 1;
    return n * factorial(n - 1);
}

int main(void)
{
    int result = factorial(5);
    printf("5! = %d\\n", result);
    return 0;
}
`,
  },
  {
    id: 'swap',
    title: 'Pointers: swap',
    hint: 'Step into swap and look at a and b in the Variables tab: they hold the addresses of x and y.',
    breakpoints: [5],
    code: `#include <stdio.h>

void swap(int *a, int *b)
{
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void)
{
    int x = 1, y = 2;
    swap(&x, &y);
    printf("x = %d, y = %d\\n", x, y);
    return 0;
}
`,
  },
  {
    id: 'strings',
    title: 'Arrays and strings',
    hint: 'A char array is just bytes on the stack. Watch the Stack tab as reverse() swaps them.',
    code: `#include <stdio.h>
#include <string.h>

void reverse(char *s)
{
    int i = 0, j = (int)strlen(s) - 1;
    while (i < j) {
        char c = s[i];
        s[i] = s[j];
        s[j] = c;
        i++;
        j--;
    }
}

int main(void)
{
    char word[] = "stressed";
    int counts[5] = {1, 2, 3};
    reverse(word);
    printf("%s (%zu bytes)\\n", word, sizeof word);
    printf("%d %d\\n", counts[2], counts[4]);
    return 0;
}
`,
  },
  {
    id: 'list',
    title: 'A linked list on the heap',
    hint: 'Each malloc creates a block in the Heap tab. Expand list in Variables to follow the next pointers.',
    breakpoints: [27],
    code: `#include <stdio.h>
#include <stdlib.h>

struct node {
    int value;
    struct node *next;
};

struct node *push(struct node *head, int value)
{
    struct node *n = malloc(sizeof *n);
    n->value = value;
    n->next = head;
    return n;
}

int main(void)
{
    struct node *list = NULL;
    for (int i = 1; i <= 4; i++)
        list = push(list, i * 10);

    for (struct node *p = list; p != NULL; p = p->next)
        printf("%d ", p->value);
    printf("\\n");

    while (list != NULL) {
        struct node *next = list->next;
        free(list);
        list = next;
    }
    return 0;
}
`,
  },
  {
    id: 'structs',
    title: 'Structs, typedef and padding',
    hint: 'sizeof(struct record) is not the sum of its fields. The Stack tab shows where the padding bytes go.',
    code: `#include <stdio.h>

typedef struct {
    char tag;      /* 1 byte, then 3 bytes of padding */
    int count;     /* 4 bytes */
    char flag;     /* 1 byte, then 7 bytes of padding */
    long total;    /* 8 bytes */
} record;

struct point { int x, y; };

int main(void)
{
    record r = { 'A', 3, 1, 1000 };
    struct point pts[2] = { {1, 2}, {.y = 7} };
    struct point *p = &pts[1];
    p->x = r.count;

    printf("sizeof(record) = %zu\\n", sizeof(record));
    printf("pts[1] = (%d, %d)\\n", pts[1].x, pts[1].y);
    return 0;
}
`,
  },
  {
    id: 'input',
    title: 'Reading input with scanf',
    hint: 'Edit the stdin box below the output, then Run again.',
    stdin: '5 10 15 20',
    code: `#include <stdio.h>

int main(void)
{
    int n, total = 0, count = 0;

    while (scanf("%d", &n) == 1) {
        total += n;
        count++;
    }
    if (count > 0)
        printf("%d numbers, total %d, average %d\\n", count, total, total / count);
    else
        printf("no numbers on stdin\\n");
    return 0;
}
`,
  },
  {
    id: 'garbage',
    title: 'Uninitialized variables',
    hint: 'Debug and look at the locals before they are assigned: the stack holds leftover garbage.',
    breakpoints: [7],
    code: `#include <stdio.h>

int main(void)
{
    int sum;            /* never initialized! */
    int values[4];
    for (int i = 0; i < 4; i++)
        values[i] = i;
    for (int i = 0; i < 4; i++)
        sum += values[i];
    printf("sum = %d\\n", sum);   /* not 6: garbage + 6 */
    return 0;
}
`,
  },
  {
    id: 'uaf',
    title: 'Bug: use after free',
    hint: 'The sanitizer stops the program at the bad read and says where the block was allocated and freed.',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int *scores = malloc(3 * sizeof *scores);
    scores[0] = 90;
    scores[1] = 85;
    scores[2] = 77;
    free(scores);

    printf("first score: %d\\n", scores[0]);   /* use after free */
    return 0;
}
`,
  },
  {
    id: 'overflow',
    title: 'Bug: off-by-one heap overflow',
    hint: 'The loop writes one element past the end. Untick Sanitizer to see it "work" silently, which is the dangerous part.',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int n = 5;
    int *squares = malloc(n * sizeof *squares);

    for (int i = 0; i <= n; i++)     /* should be i < n */
        squares[i] = i * i;

    printf("%d\\n", squares[n - 1]);
    free(squares);
    return 0;
}
`,
  },
  {
    id: 'null',
    title: 'Bug: NULL pointer dereference',
    hint: 'After the crash, the Stack and Variables tabs show the state at the moment of the fault, like a core dump in gdb.',
    code: `#include <stdio.h>

struct node { int value; struct node *next; };

int sum(const struct node *n)
{
    int total = 0;
    while (n->value >= 0) {     /* bug: should test n != NULL */
        total += n->value;
        n = n->next;
    }
    return total;
}

int main(void)
{
    struct node c = { 3, NULL }, b = { 2, &c }, a = { 1, &b };
    printf("%d\\n", sum(&a));
    return 0;
}
`,
  },
  {
    id: 'smash',
    title: 'Bug: stack buffer overflow',
    hint: 'strcpy writes past name[8] and over the saved rbp and return address. Step with Step Instruction near the end and watch ret jump into garbage.',
    breakpoints: [7],
    code: `#include <stdio.h>
#include <string.h>

void greet(const char *who)
{
    char name[8];
    strcpy(name, who);          /* no bounds check! */
    printf("hello, %s\\n", name);
}

int main(void)
{
    greet("Ada");
    greet("a name that is much too long for the buffer");
    return 0;
}
`,
  },
  {
    id: 'leak',
    title: 'Bug: memory leak',
    hint: 'The program runs fine, but LeakSanitizer reports the block that was never freed when it exits.',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *make_greeting(const char *name)
{
    char *s = malloc(strlen(name) + 8);
    strcpy(s, "Hello, ");
    strcat(s, name);
    return s;
}

int main(void)
{
    char *a = make_greeting("Ada");
    char *b = make_greeting("Grace");
    printf("%s\\n%s\\n", a, b);
    free(a);                    /* b is never freed */
    return 0;
}
`,
  },
];
