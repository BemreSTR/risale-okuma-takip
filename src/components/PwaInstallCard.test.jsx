import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PwaInstallCard from './PwaInstallCard'

describe('PwaInstallCard', () => {
  it('renders install prompt card when not installed', () => {
    render(<PwaInstallCard />)
    expect(screen.getByText('Telefona Uygulama Olarak Ekle')).toBeInTheDocument()
  })
})
