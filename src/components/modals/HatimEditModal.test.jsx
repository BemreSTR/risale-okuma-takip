import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HatimEditModal from './HatimEditModal'

describe('HatimEditModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <HatimEditModal
        isOpen={false}
        onClose={vi.fn()}
        selectedHatimBook="Sözler"
        hatimCountInput="2"
        setHatimCountInput={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render book title and accept updated hatim counts', () => {
    const setHatimCountInput = vi.fn()
    const onSave = vi.fn()

    render(
      <HatimEditModal
        isOpen={true}
        onClose={vi.fn()}
        selectedHatimBook="Lemalar"
        hatimCountInput="3"
        setHatimCountInput={setHatimCountInput}
        onSave={onSave}
      />
    )

    expect(screen.getByText('Hatim Sayısı Düzenle')).toBeInTheDocument()
    expect(screen.getByText('Lemalar')).toBeInTheDocument()

    const input = screen.getByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '4' } })
    expect(setHatimCountInput).toHaveBeenCalledWith('4')

    fireEvent.click(screen.getByText('Kaydet'))
    expect(onSave).toHaveBeenCalled()
  })
})

