/**
 * Sublime 风格的模糊匹配（用于 Goto Anything / Command Palette / Goto Symbol）。
 * 采用 O(queryLen * targetLen) 的一维滚动 DP：查询字符必须按序出现在目标串中，
 * 计分偏好单词边界、驼峰边界、连续命中、靠近开头，并对空隙与首部跳过作惩罚。
 */

export interface FuzzyResult {
  /** 分数越高越匹配；仅用于相对排序 */
  score: number
  /** 命中的目标下标（供 UI 高亮） */
  positions: number[]
}

const MATCH_BASE = 100
const WORD_BOUNDARY_BONUS = 60
const CAMEL_BONUS = 40
const CONSECUTIVE_BONUS = 30
const GAP_PENALTY = 4
const LEADING_PENALTY = 1
const TRAILING_PENALTY = 1

function isWordBoundary(s: string, i: number): boolean {
  if (i === 0) return true
  const prev = s.charCodeAt(i - 1)
  const cur = s.charCodeAt(i)
  const isAlphaNum = (c: number) =>
    (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c >= 0x80
  if (!isAlphaNum(prev)) return true
  // 驼峰边界：aB
  if (
    prev >= 97 &&
    prev <= 122 &&
    cur >= 65 &&
    cur <= 90
  ) {
    return true
  }
  return false
}

function matchBonus(s: string, i: number): number {
  const c = s.charCodeAt(i)
  const isUpper = c >= 65 && c <= 90
  if (isWordBoundary(s, i)) return MATCH_BASE + WORD_BOUNDARY_BONUS + (isUpper ? CAMEL_BONUS : 0)
  if (isUpper) return MATCH_BASE + CAMEL_BONUS
  return MATCH_BASE
}

export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  const q = query.length
  const n = target.length
  if (q === 0) return { score: 0, positions: [] }
  if (q > n) return null

  const ql = query.toLowerCase()
  const tl = target.toLowerCase()

  // back[k][j] = 匹配到第 k 个查询字符、结束于 target[j] 时，前一个查询字符命中的 target 下标
  const back: number[][] = new Array(q)
  for (let k = 0; k < q; k++) back[k] = new Array(n).fill(-1)

  // 第 0 个查询字符的初始化
  let prevBest = new Array(n).fill(-Infinity)
  for (let j = 0; j < n; j++) {
    if (tl[j] === ql[0]) {
      prevBest[j] = matchBonus(target, j) - j * LEADING_PENALTY
      back[0][j] = -1
    }
  }

  // 滚动递推
  for (let k = 1; k < q; k++) {
    const currBest = new Array(n).fill(-Infinity)
    let runningBest = -Infinity
    let runningPos = -1
    for (let j = 0; j < n; j++) {
      if (tl[j] === ql[k] && runningBest > -Infinity) {
        const gap = j - runningPos - 1
        const consecutive = gap === 0 ? CONSECUTIVE_BONUS : 0
        currBest[j] = runningBest + matchBonus(target, j) + consecutive - gap * GAP_PENALTY
        back[k][j] = runningPos
      }
      // 将 prevBest[j] 折叠进 running（供后续位置使用，严格保持 < j）
      if (prevBest[j] > runningBest) {
        runningBest = prevBest[j]
        runningPos = j
      }
    }
    prevBest = currBest
  }

  // 选择最终最佳结束位置（附加轻微尾部惩罚，偏好更紧凑的命中）
  let bestScore = -Infinity
  let bestEnd = -1
  for (let j = 0; j < n; j++) {
    if (prevBest[j] > -Infinity) {
      const trailing = (n - j - 1) * TRAILING_PENALTY
      const s = prevBest[j] - trailing
      if (s > bestScore) {
        bestScore = s
        bestEnd = j
      }
    }
  }

  if (bestEnd === -1) return null

  // 回溯命中位置
  const positions: number[] = new Array(q)
  let pos = bestEnd
  for (let k = q - 1; k >= 0; k--) {
    positions[k] = pos
    pos = back[k][pos]
  }
  return { score: bestScore, positions }
}

export function fuzzyFilter<T>(
  query: string,
  items: T[],
  toText: (item: T) => string
): { item: T; text: string; match: FuzzyResult }[] {
  if (query.length === 0) {
    return items.map((item) => {
      const text = toText(item)
      return { item, text, match: { score: 0, positions: [] } }
    })
  }
  const out: { item: T; text: string; match: FuzzyResult }[] = []
  for (const item of items) {
    const text = toText(item)
    const m = fuzzyMatch(query, text)
    if (m) out.push({ item, text, match: m })
  }
  out.sort((a, b) => b.match.score - a.match.score)
  return out
}

/** 计算一组字符串中的公共前缀（用于 Goto Anything 相对路径显示） */
export function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return ''
  let prefix = strings[0]
  for (let i = 1; i < strings.length; i++) {
    const s = strings[i]
    let j = 0
    while (j < prefix.length && j < s.length && prefix[j] === s[j]) j++
    prefix = prefix.slice(0, j)
    if (prefix.length === 0) break
  }
  return prefix
}