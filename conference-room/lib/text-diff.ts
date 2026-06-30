export type DiffToken = {
  type: "equal" | "added" | "removed"
  text: string
}

function tokenize(text: string): string[] {
  // Keep whitespace as its own tokens so the diff can reconstruct the text.
  return text.split(/(\s+)/).filter((token) => token.length > 0)
}

function mergeAdjacent(tokens: DiffToken[]): DiffToken[] {
  const merged: DiffToken[] = []

  for (const token of tokens) {
    const previous = merged[merged.length - 1]

    if (previous && previous.type === token.type) {
      previous.text += token.text
      continue
    }

    merged.push({ ...token })
  }

  return merged
}

/**
 * Word-level diff via longest-common-subsequence. Returns runs of equal /
 * added / removed text. Intended for short documents (a report), so the
 * O(n*m) table is fine.
 */
export function diffWords(before: string, after: string): DiffToken[] {
  const a = tokenize(before)
  const b = tokenize(after)
  const n = a.length
  const m = b.length

  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  )

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const tokens: DiffToken[] = []
  let i = 0
  let j = 0

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tokens.push({ type: "equal", text: a[i] })
      i += 1
      j += 1
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      tokens.push({ type: "removed", text: a[i] })
      i += 1
    } else {
      tokens.push({ type: "added", text: b[j] })
      j += 1
    }
  }

  while (i < n) {
    tokens.push({ type: "removed", text: a[i] })
    i += 1
  }

  while (j < m) {
    tokens.push({ type: "added", text: b[j] })
    j += 1
  }

  return mergeAdjacent(tokens)
}

export function hasChanges(tokens: DiffToken[]): boolean {
  return tokens.some((token) => token.type !== "equal")
}
