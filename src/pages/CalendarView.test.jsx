import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CalendarView from './CalendarView'
import { getTodayStr } from '../utils/helpers'

describe('CalendarView Component', () => {
  const buildTodayKey = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  it('should render selected day reading logs and total without Sil button in read-only mode', () => {
    const todayKey = buildTodayKey()
    const logs = {
      [todayKey]: [
        { id: 'log-1', title: 'Şualar', amount: 37, date: todayKey }
      ]
    }

    render(<CalendarView logs={logs} />)

    expect(screen.getByText('Şualar')).toBeInTheDocument()
    expect(screen.getByText('+37 sayfa')).toBeInTheDocument()
    expect(screen.getByText('Toplam: 37 sayfa')).toBeInTheDocument()
    expect(screen.queryByText('Sil')).not.toBeInTheDocument()
  })

  it('should render Sil button when onDeleteLog is provided and trigger it on click', () => {
    const todayKey = buildTodayKey()
    const sampleLog = { id: 'log-1', book_id: 'book-1', title: 'Şualar', amount: 37, date: todayKey }
    const logs = {
      [todayKey]: [sampleLog]
    }
    const onDeleteLog = vi.fn()

    render(<CalendarView logs={logs} onDeleteLog={onDeleteLog} />)

    const deleteBtn = screen.getByRole('button', { name: 'Şualar okuma kaydını sil' })
    expect(deleteBtn).toBeInTheDocument()
    expect(deleteBtn).not.toBeDisabled()

    fireEvent.click(deleteBtn)
    expect(onDeleteLog).toHaveBeenCalledTimes(1)
    expect(onDeleteLog).toHaveBeenCalledWith(sampleLog)
  })

  it('should disable Sil button and display loading text while deleting', () => {
    const todayKey = buildTodayKey() || getTodayStr()
    const logs = {
      [todayKey]: [
        { id: 'log-1', title: 'Mektubat', amount: 15, date: todayKey }
      ]
    }

    render(<CalendarView logs={logs} onDeleteLog={vi.fn()} deletingLogId="log-1" />)

    const deleteBtn = screen.getByRole('button', { name: 'Mektubat okuma kaydını sil' })
    expect(deleteBtn).toBeDisabled()
    expect(screen.getByText('Siliniyor...')).toBeInTheDocument()
  })
})
