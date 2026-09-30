import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RecordScope } from '../../workspace/RecordScope'
import { openSelectedRecord } from './selectedRecord'

export function SelectedRecordRoute({ children }: { children: ReactNode }) {
  const [params] = useSearchParams()
  const id = params.get('record') ?? 'TERM-NORTH'
  return <RecordScope id={id} back={'/terminal/berth-workspace?terminal=' + encodeURIComponent(id)}
    open={target => openSelectedRecord(window.localStorage, target)}>{children}</RecordScope>
}
