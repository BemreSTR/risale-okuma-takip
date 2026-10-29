import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NavBar from './NavBar'

describe('NavBar Component', () => {
  it('should render all 4 main navigation buttons', () => {
    const setActiveTab = vi.fn()
    render(<NavBar activeTab="home" setActiveTab={setActiveTab} />)

    expect(screen.getByText('Takip')).toBeInTheDocument()
    expect(screen.getByText('Geçmiş')).toBeInTheDocument()
    expect(screen.getByText('Grup')).toBeInTheDocument()
    expect(screen.getByText('Profil')).toBeInTheDocument()
  })

  it('should call setActiveTab with the right tab when a nav button is clicked', () => {
    const setActiveTab = vi.fn()
    render(<NavBar activeTab="home" setActiveTab={setActiveTab} />)

    fireEvent.click(screen.getByText('Geçmiş'))
    expect(setActiveTab).toHaveBeenCalledWith('calendar')

    fireEvent.click(screen.getByText('Grup'))
    expect(setActiveTab).toHaveBeenCalledWith('friends')

    fireEvent.click(screen.getByText('Profil'))
    expect(setActiveTab).toHaveBeenCalledWith('profile')
  })
})

