import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EditNameModal from './EditNameModal'

describe('EditNameModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <EditNameModal
        isOpen={false}
        onClose={vi.fn()}
        newNameInput="Ahmet"
        setNewNameInput={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render modal and accept name changes', () => {
    const setNewNameInput = vi.fn()
    const onSave = vi.fn()

    render(
      <EditNameModal
        isOpen={true}
        onClose={vi.fn()}
        newNameInput="Ahmet"
        setNewNameInput={setNewNameInput}
        onSave={onSave}
      />
    )

    expect(screen.getByText('İsmini Düzenle')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('Ad Soyad')
    expect(input).toHaveValue('Ahmet')

    fireEvent.change(input, { target: { value: 'Ahmet Yılmaz' } })
    expect(setNewNameInput).toHaveBeenCalledWith('Ahmet Yılmaz')

    fireEvent.click(screen.getByText('Güncelle'))
    expect(onSave).toHaveBeenCalled()
  })
})

