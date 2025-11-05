import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '@/components/footer'

// Example component test for the Footer component
// This demonstrates how to test React components
describe('Footer Component', () => {
  it('should render the footer', () => {
    render(<Footer />)
    
    // Check that footer element exists
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })

  it('should display the WebDrop brand name', () => {
    render(<Footer />)
    
    expect(screen.getByText('WebDrop')).toBeInTheDocument()
  })

  it('should display the copyright year', () => {
    render(<Footer />)
    
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
  })

  it('should have navigation links', () => {
    render(<Footer />)
    
    // Check for Home link
    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
    
    // Check for Profile link
    const profileLink = screen.getByRole('link', { name: 'Profile' })
    expect(profileLink).toBeInTheDocument()
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('should have GitHub links with correct attributes', () => {
    render(<Footer />)
    
    // Get all links that contain "GitHub"
    const githubLinks = screen.getAllByRole('link', { name: /GitHub/i })
    
    // Should have at least one GitHub link
    expect(githubLinks.length).toBeGreaterThan(0)
    
    // Check first GitHub link attributes
    expect(githubLinks[0]).toHaveAttribute('target', '_blank')
    expect(githubLinks[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should display the tagline', () => {
    render(<Footer />)
    
    expect(screen.getByText(/Secure peer-to-peer file sharing/i)).toBeInTheDocument()
    expect(screen.getByText(/WebRTC/i)).toBeInTheDocument()
  })

  it('should have proper structure with sections', () => {
    render(<Footer />)
    
    // Check for section headings
    expect(screen.getByText('Quick Links')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
  })
})
