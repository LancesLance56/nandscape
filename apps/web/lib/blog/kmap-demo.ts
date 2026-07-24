export function hiddenFunction(a: boolean, b: boolean, c: boolean): boolean {
  return (!a && c) || (a && b);
}

export function bitsToMinterm(a: boolean, b: boolean, c: boolean): number {
  return (a ? 4 : 0) + (b ? 2 : 0) + (c ? 1 : 0);
}

export function mintermToBits(minterm: number): [boolean, boolean, boolean] {
  return [(minterm & 4) !== 0, (minterm & 2) !== 0, (minterm & 1) !== 0];
}

export function evaluateMinterm(minterm: number): boolean {
  const [a, b, c] = mintermToBits(minterm);
  return hiddenFunction(a, b, c);
}