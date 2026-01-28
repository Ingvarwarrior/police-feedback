import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import LandingPage from '@/components/landing/LandingPage'

describe('LandingPage', () => {
    it('renders the main heading', () => {
        // Mock Next.js Image component since it might cause issues in simple jest env or require config
        // Actually, Next 13+ handles it well with next/jest, but let's see. 
        // We will try running without mocks first.

        render(<LandingPage />)

        const heading = screen.getByRole('heading', { level: 1 })

        expect(heading).toBeInTheDocument()
        expect(heading).toHaveTextContent(/ВАШ ВІДГУК/i)
    })
})
