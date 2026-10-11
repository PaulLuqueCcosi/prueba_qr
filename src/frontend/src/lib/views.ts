import {
  Activity,
  Grid3x3,
  KeyRound,
  Sigma,
  type LucideIcon,
} from 'lucide-react'

export type ViewId = 'qr' | 'statistics' | 'health' | 'developer'

export interface ViewDefinition {
  id: ViewId
  /** Label, title and description live in the translations under `views.<id>`. */
  icon: LucideIcon
  group: 'tools' | 'developer'
}

export const VIEWS: ViewDefinition[] = [
  {
    id: 'qr',
    icon: Grid3x3,
    group: 'tools',
  },
  {
    id: 'statistics',
    icon: Sigma,
    group: 'tools',
  },
  {
    id: 'health',
    icon: Activity,
    group: 'developer',
  },
  {
    id: 'developer',
    icon: KeyRound,
    group: 'developer',
  },
]
