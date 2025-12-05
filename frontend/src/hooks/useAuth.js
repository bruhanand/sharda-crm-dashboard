/**
 * Custom React hooks for authentication management.
 * Extracted from App.jsx to improve code organization and reusability.
 */
import { useState } from 'react'

/**
 * Custom hook for managing authentication state
 * @returns {Object} Authentication state and handlers
 */
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(() =>
        !!localStorage.getItem('authToken')
    )

    const [currentUser, setCurrentUser] = useState(() => {
        const userData = localStorage.getItem('user')
        return userData ? JSON.parse(userData) : null
    })

    /**
     * Handle successful login
     * @param {string} token - Authentication token
     */
    const handleLogin = (token) => {
        setIsAuthenticated(true)
    }

    /**
     * Handle user logout - clears all auth data
     */
    const handleLogout = () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setCurrentUser(null)
    }

    return {
        isAuthenticated,
        currentUser,
        handleLogin,
        handleLogout,
    }
}
