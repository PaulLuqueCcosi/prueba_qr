import type { TFunction } from 'i18next'

/**
 * A validation problem described by translation key + params, so the lib layer
 * stays free of UI text and the component translates it in the active language.
 */
export interface Issue {
  key:
    | 'issues.invalidJson'
    | 'issues.emptyMatrix'
    | 'issues.emptyRow'
    | 'issues.notRectangular'
    | 'issues.notFinite'
    | 'issues.expectedObject'
    | 'issues.emptyCells'
    | 'issues.invalidNumber'
    | 'issues.tooLarge'
  params?: Record<string, string | number>
  /** Optional prefix naming the offending field, e.g. "q". */
  field?: string
}

export function translateIssue(t: TFunction, issue: Issue): string {
  const translate = t as unknown as (key: string, options?: object) => string
  const text = translate(issue.key, issue.params)
  return issue.field ? `"${issue.field}": ${text}` : text
}
