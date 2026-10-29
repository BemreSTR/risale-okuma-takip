import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddBookModal from './AddBookModal'
import { RISALE_BOOKS } from '../../constants'

describe('AddBookModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(<AddBookModal isOpen={false} onClose={vi.fn()} onAddBook={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render all 14 Risale-i Nur books when isOpen is true', () => {
    render(<AddBookModal isOpen={true} onClose={vi.fn()} onAddBook={vi.fn()} />)

    expect(screen.getByText('Kitap Seç')).toBeInTheDocument()
    RISALE_BOOKS.forEach((bookTitle) => {
      expect(screen.getByText(bookTitle)).toBeInTheDocument()
    })
  })

  it('should call onAddBook with the selected title when a book is clicked', () => {
    const onAddBook = vi.fn()
    render(<AddBookModal isOpen={true} onClose={vi.fn()} onAddBook={onAddBook} />)

    fireEvent.click(screen.getByText('Sözler'))
    expect(onAddBook).toHaveBeenCalledWith('Sözler')

    fireEvent.click(screen.getByText('Lemalar'))
    expect(onAddBook).toHaveBeenCalledWith('Lemalar')
  })
})

