// Turkish-aware text search helpers.
//
// `toLowerCase()` mangles Turkish text: "İ" becomes "i" plus a combining dot, "I" stays "I" and
// "ı" never meets "i". That is why searching "ispanak" does not find "İSPANAK". Every character is
// folded to a plain ASCII base instead, one character in / one character out, so the folded string
// keeps the same indexes as the original and can still be used for highlighting.

const CHAR_FOLD: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'ı': 'i',
  'Ş': 's', 'ş': 's',
  'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u',
  'Ö': 'o', 'ö': 'o',
  'Ç': 'c', 'ç': 'c',
  'Â': 'a', 'â': 'a',
  'Î': 'i', 'î': 'i',
  'Û': 'u', 'û': 'u',
}

const foldChar = (char: string): string => {
  const mapped = CHAR_FOLD[char]
  if (mapped) return mapped
  const lower = char.toLowerCase()
  // Never let a fold change the length, otherwise highlight offsets drift.
  return lower.length === char.length ? lower : char
}

/** Folds text so that Turkish and ASCII spellings of the same word compare equal. */
export const normalizeForSearch = (input: unknown): string =>
  Array.from(String(input ?? '')).map(foldChar).join('')

/** Splits a query into search tokens, so "50 gr domates" also matches "Domates Salçası 50 GR". */
export const tokenizeQuery = (query: string): string[] =>
  normalizeForSearch(query).split(/\s+/).filter(token => token !== '')

/** True when every token of the query appears somewhere in the given fields. */
export const matchesQuery = (fields: Array<string | undefined | null>, query: string): boolean => {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return true
  const haystack = normalizeForSearch(fields.filter(Boolean).join(' '))
  return tokens.every(token => haystack.includes(token))
}

/**
 * Ranks a match so the most likely product surfaces first: an exact name beats a name that starts
 * with the query, which beats a word inside the name, which beats a hit in a secondary field
 * (product key, SAP code, ...). Lower is better.
 */
export const rankMatch = (primary: string, secondary: Array<string | undefined | null>, query: string): number => {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return 3

  const normalizedPrimary = normalizeForSearch(primary)
  const normalizedQuery = tokens.join(' ')

  if (normalizedPrimary === normalizedQuery) return 0
  if (normalizedPrimary.startsWith(normalizedQuery)) return 1
  if (tokens.every(token => normalizedPrimary.split(/\s+/).some(word => word.startsWith(token)))) return 2
  if (tokens.every(token => normalizedPrimary.includes(token))) return 3
  if (matchesQuery(secondary, query)) return 4
  return 5
}

export interface HighlightSegment {
  text: string
  match: boolean
}

/** Splits text into matched / unmatched segments so the UI can highlight what the user typed. */
export const highlightMatches = (text: string, query: string): HighlightSegment[] => {
  const source = String(text ?? '')
  const tokens = tokenizeQuery(query)
  if (source === '' || tokens.length === 0) return [{ text: source, match: false }]

  const normalized = normalizeForSearch(source)
  const hits = new Array<boolean>(source.length).fill(false)

  tokens.forEach(token => {
    let from = normalized.indexOf(token)
    while (from !== -1) {
      for (let index = from; index < from + token.length; index++) hits[index] = true
      from = normalized.indexOf(token, from + token.length)
    }
  })

  const segments: HighlightSegment[] = []
  let cursor = 0
  while (cursor < source.length) {
    const state = hits[cursor]
    let end = cursor + 1
    while (end < source.length && hits[end] === state) end++
    segments.push({ text: source.slice(cursor, end), match: state })
    cursor = end
  }
  return segments
}
