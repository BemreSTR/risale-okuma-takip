import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReadModal from './ReadModal'

describe('ReadModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <ReadModal
        isOpen={false}
        onClose={vi.fn()}
        selectedBook={{ title: 'Sözler' }}
        pagesInput=""
        setPagesInput={vi.fn()}
        dateInput="2026-10-29"
        setDateInput={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render modal with selected book title when isOpen is true', () => {
    render(
      <ReadModal
        isOpen={true}
        onClose={vi.fn()}
        selectedBook={{ title: 'Mektubat' }}
        pagesInput=""
        setPagesInput={vi.fn()}
        dateInput="2026-10-29"
        setDateInput={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByText('Okuma Ekle')).toBeInTheDocument()
    expect(screen.getByText('Mektubat')).toBeInTheDocument()
  })

  it('should handle input changes and trigger onSave on submit', () => {
    const setPagesInput = vi.fn()
    const onSave = vi.fn()

    render(
      <ReadModal
        isOpen={true}
        onClose={vi.fn()}
        selectedBook={{ title: 'Sözler' }}
        pagesInput="20"
        setPagesInput={setPagesInput}
        dateInput="2026-10-29"
        setDateInput={vi.fn()}
        onSave={onSave}
      />
    )

    const input = screen.getByPlaceholderText('Örn: 10')
    fireEvent.change(input, { target: { value: '25' } })
    expect(setPagesInput).toHaveBeenCalledWith('25')

    const saveButton = screen.getByText('Kaydet')
    fireEvent.click(saveButton)
    expect(onSave).toHaveBeenCalled()
  })
})

