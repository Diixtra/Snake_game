// Revival problem bank. Tiers map to snake length at the moment of death,
// so the price of a continue rises as your run gets more valuable.

export type Tier = 'rookie' | 'coder' | 'hacker' | 'architect';

export interface Problem {
  language: 'JavaScript' | 'Python' | 'CS';
  prompt: string;
  code?: string;
  /** Accepted answers, compared after normalize(): lowercased, whitespace and [](),'"; stripped. */
  answers: string[];
  hint: string;
}

export function tierForLength(length: number): Tier {
  if (length < 8) return 'rookie';
  if (length < 14) return 'coder';
  if (length < 22) return 'hacker';
  return 'architect';
}

/** Seconds allowed on the quiz timer per tier. */
export const TIER_TIME: Record<Tier, number> = {
  rookie: 30,
  coder: 40,
  hacker: 50,
  architect: 60,
};

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s[\](),'";]/g, '');
}

const POOLS: Record<Tier, Problem[]> = {
  rookie: [
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'console.log(2 + "2");',
      answers: ['22'],
      hint: 'Adding a number to a string concatenates.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print(len("snake"))',
      answers: ['5'],
      hint: 'Count the letters.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print(7 // 2)',
      answers: ['3'],
      hint: '// is floor division.',
    },
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'console.log([10, 20, 30].length);',
      answers: ['3'],
      hint: 'How many elements are in the array?',
    },
    {
      language: 'JavaScript',
      prompt: 'true or false?',
      code: 'console.log(Boolean(""));',
      answers: ['false'],
      hint: 'An empty string is falsy.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print("py" + "thon")',
      answers: ['python'],
      hint: '+ joins strings.',
    },
  ],
  coder: [
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print([1, 2, 3][-1])',
      answers: ['3'],
      hint: 'Negative indices count from the end.',
    },
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'console.log("snake".slice(1, 3));',
      answers: ['na'],
      hint: 'slice(start, end) — end is exclusive.',
    },
    {
      language: 'Python',
      prompt: 'What list does this print?',
      code: 'print(list(range(2, 8, 2)))',
      answers: ['246'],
      hint: 'Start at 2, step by 2, stop before 8.',
    },
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'console.log(typeof null);',
      answers: ['object'],
      hint: 'A famous historical quirk of the language.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print(sum(i for i in range(4)))',
      answers: ['6'],
      hint: '0 + 1 + 2 + 3.',
    },
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'console.log([..."hi!"].reverse().join(""));',
      answers: ['!ih'],
      hint: 'Spread the string into characters, then flip it.',
    },
  ],
  hacker: [
    {
      language: 'JavaScript',
      prompt: 'What does this print?',
      code: 'const f = (n) => (n <= 1 ? 1 : n * f(n - 1));\nconsole.log(f(4));',
      answers: ['24'],
      hint: 'Recursive factorial.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'x = [1, 2]\ny = x\ny.append(3)\nprint(len(x))',
      answers: ['3'],
      hint: 'y is not a copy — it is the same list.',
    },
    {
      language: 'JavaScript',
      prompt: 'What number does this print?',
      code: 'console.log(5 ^ 3);',
      answers: ['6'],
      hint: '^ is bitwise XOR: 101 ^ 011.',
    },
    {
      language: 'JavaScript',
      prompt: 'What is printed (give the three values in order)?',
      code: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}',
      answers: ['333'],
      hint: 'var is function-scoped; the loop finishes before any timeout runs.',
    },
    {
      language: 'CS',
      prompt: 'What is the time complexity of binary search on a sorted array of n items?',
      answers: ['ologn', 'logn', 'logarithmic', 'olog2n', 'log2n'],
      hint: 'Each comparison halves the search space.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'print(bin(10)[2:])',
      answers: ['1010'],
      hint: 'bin() returns "0b....".',
    },
  ],
  architect: [
    {
      language: 'JavaScript',
      prompt: 'true or false?',
      code: 'console.log(0.1 + 0.2 === 0.3);',
      answers: ['false'],
      hint: 'IEEE 754 floating point cannot represent these exactly.',
    },
    {
      language: 'Python',
      prompt: 'What does this print?',
      code: 'def f(x, acc=[]):\n    acc.append(x)\n    return acc\n\nf(1)\nprint(f(2))',
      answers: ['12'],
      hint: 'Default arguments are evaluated once, at definition time.',
    },
    {
      language: 'JavaScript',
      prompt: 'In what order are the letters printed?',
      code: 'console.log("a");\nPromise.resolve().then(() => console.log("b"));\nconsole.log("c");',
      answers: ['acb'],
      hint: 'Microtasks run after the current synchronous code completes.',
    },
    {
      language: 'JavaScript',
      prompt: 'What array does this produce?',
      code: 'console.log([1, 2, 3].map(parseInt));',
      answers: ['1nannan'],
      hint: 'map passes the index as the second argument — the radix.',
    },
    {
      language: 'CS',
      prompt:
        'Inserting n items one at a time at the FRONT of a dynamic array — total time complexity?',
      answers: ['on^2', 'on2', 'n^2', 'n2', 'quadratic', 'on*n'],
      hint: 'Every insert shifts everything already there.',
    },
    {
      language: 'CS',
      prompt: 'Average-case lookup complexity of a hash table?',
      answers: ['o1', '1', 'constant', 'constanttime'],
      hint: 'That is the whole point of hashing.',
    },
  ],
};

/**
 * Hands out problems for a tier in random order without repeats
 * until a tier's pool is exhausted, then reshuffles.
 */
export class ProblemBank {
  private bags = new Map<Tier, Problem[]>();

  draw(tier: Tier): Problem {
    let bag = this.bags.get(tier);
    if (!bag || bag.length === 0) {
      bag = [...POOLS[tier]];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bags.set(tier, bag);
    }
    return bag.pop()!;
  }

  check(problem: Problem, answer: string): boolean {
    const a = normalize(answer);
    return a.length > 0 && problem.answers.some((ok) => normalize(ok) === a);
  }
}
