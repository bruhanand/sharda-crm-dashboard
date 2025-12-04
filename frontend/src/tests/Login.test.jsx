import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../components/Login'

describe('Login Component', () => {
    let mockOnLogin

    beforeEach(() => {
        mockOnLogin = vi.fn()
        global.fetch = vi.fn()
        localStorage.clear()
    })

    it('renders login form with username and password fields', () => {
        render(<Login onLogin={mockOnLogin} />)

        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })

    it('updates input values when typing', () => {
        render(<Login onLogin={mockOnLogin} />)

        const usernameInput = screen.getByPlaceholderText(/username/i)
        const passwordInput = screen.getByPlaceholderText(/password/i)

        fireEvent.change(usernameInput, { target: { value: 'testuser' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        expect(usernameInput.value).toBe('testuser')
        expect(passwordInput.value).toBe('password123')
    })

    it('displays error message on failed login', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Invalid credentials'),
        })

        render(<Login onLogin={mockOnLogin} />)

        fireEvent.change(screen.getByPlaceholderText(/username/i), {
            target: { value: 'wronguser' }
        })
        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'wrongpass' }
        })
        fireEvent.click(screen.getByRole('button', { name: /login/i }))

        await waitFor(() => {
            expect(screen.getByText(/invalid/i)).toBeInTheDocument()
        })

        expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('calls onLogin with token on successful login', async () => {
        const mockToken = 'test-auth-token-123'
        const mockUser = { username: 'testuser', is_admin: false }

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ token: mockToken, user: mockUser }),
        })

        render(<Login onLogin={mockOnLogin} />)

        fireEvent.change(screen.getByPlaceholderText(/username/i), {
            target: { value: 'testuser' }
        })
        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'correctpass' }
        })
        fireEvent.click(screen.getByRole('button', { name: /login/i }))

        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalledWith(mockToken)
        })

        expect(localStorage.setItem).toHaveBeenCalledWith('authToken', mockToken)
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
    })

    it('shows loading state while submitting', async () => {
        global.fetch.mockImplementationOnce(() => new Promise(() => { })) // Never resolves

        render(<Login onLogin={mockOnLogin} />)

        fireEvent.change(screen.getByPlaceholderText(/username/i), {
            target: { value: 'testuser' }
        })
        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'password' }
        })

        const loginButton = screen.getByRole('button', { name: /login/i })
        fireEvent.click(loginButton)

        await waitFor(() => {
            expect(loginButton).toBeDisabled()
        })
    })

    it('prevents submission with empty fields', () => {
        render(<Login onLogin={mockOnLogin} />)

        const loginButton = screen.getByRole('button', { name: /login/i })
        fireEvent.click(loginButton)

        expect(global.fetch).not.toHaveBeenCalled()
        expect(mockOnLogin).not.toHaveBeenCalled()
    })
})
