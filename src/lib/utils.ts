import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function numberToWords(num: number): string {
  const a = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ];
  const b = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];
  const g = [
    '',
    'thousand',
    'million',
    'billion',
    'trillion',
    'quadrillion',
    'quintillion',
    'sextillion',
    'septillion',
    'octillion',
    'nonillion',
  ];

  const makeGroup = ([ones, tens, huns]: (number | undefined)[]) => {
    return [
      huns === 0 || huns === undefined ? '' : a[huns] + ' hundred ',
      ones === 0 || ones === undefined ? b[tens!] : (b[tens!] && b[tens!] + '-') || '',
      a[(tens ?? 0) + (ones ?? 0)] || a[ones!],
    ].join('');
  };

  const thousand = (group: string, i: number) =>
    group === '' ? group : `${group} ${g[i]}`;

  if (typeof num === 'number')
    return numberToWords(String(num));
  if (num === '0') return 'zero';

  const parseNum = (str: string | number) => parseInt(str as string, 10);
  const toWords = (str: string) => {
    let quintet = str
      .split('')
      .reverse()
      .join('')
      .match(/.{1,3}/g)!
      .map(function (x) {
        return x.split('').reverse().join('');
      });
    return quintet
      .map(function (x, i) {
        let n = parseNum(x);
        if (n === 0 && i + 1 < quintet.length) {
          let remainingQuintets = quintet.slice(i + 1);
          if (remainingQuintets.some(q => parseNum(q) !== 0)) {
            return '';
          }
        }
        if (n < 20) {
          return thousand(a[n], i);
        }
        let ones = n % 10;
        let tens = (n % 100) - ones;
        let hundreds = (n % 1000) - tens - ones;
        return thousand(
          makeGroup([ones, tens / 10, hundreds / 100]),
          i
        );
      })
      .reverse()
      .join(' ');
  };

  return toWords(num as string)
    .trim()
    .split(' ')
    .map((word, i, arr) => {
      if (i === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}