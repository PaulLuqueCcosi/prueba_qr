import { Grid3x3, KeyRound, Sigma, type LucideIcon } from 'lucide-react'

export type ViewId = 'qr' | 'statistics' | 'developer'

export interface ViewDefinition {
  id: ViewId
  /** Short label used in the sidebar. */
  label: string
  /** Page title shown in the top bar. */
  title: string
  description: string
  icon: LucideIcon
  group: 'tools' | 'developer'
}

export const VIEWS: ViewDefinition[] = [
  {
    id: 'qr',
    label: 'QR factorization',
    title: 'QR factorization',
    description: 'Q is orthogonal, R is upper triangular, and A = Q·R.',
    icon: Grid3x3,
    group: 'tools',
  },
  {
    id: 'statistics',
    label: 'Statistics',
    title: 'Statistics',
    description:
      'Max, min, average, sum and diagonal checks over three matrices.',
    icon: Sigma,
    group: 'tools',
  },
  {
    id: 'developer',
    label: 'API & token',
    title: 'API & token',
    description: 'Inspect or copy the access token to test the APIs by hand.',
    icon: KeyRound,
    group: 'developer',
  },
]
