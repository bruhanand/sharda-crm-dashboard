import React, { useState } from 'react'
import { apiRequest } from '../lib/api'
import logo from '../assets/logo.jpg'

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const payload = {
            username: username.trim(),
            password: password.trim(),
        }

        if (!payload.username || !payload.password) {
            setError('Username and password are required')
            return
        }

        setLoading(true)
        console.log('Submitting login payload:', payload)

        try {
            const data = await apiRequest('auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            console.log('Login response:', data)

            if (data.token) {
                localStorage.setItem('authToken', data.token)
                const userData = {
                    id: data.user_id,
                    username: data.username,
                    email: data.email,
                    is_admin: data.is_admin || false
                }
                localStorage.setItem('user', JSON.stringify(userData))
                console.log('Login successful, token and user data saved')
                onLogin(data.token)
            } else {
                console.error('No token in response:', data)
                setError('Login failed: No token received')
            }
        } catch (err) {
            console.error('Login error:', err)

            // Parse error message from Django's error format
            let errorMessage = 'Invalid username or password'

            if (err.message) {
                // Check if it's the Django error format with non_field_errors
                if (err.message.includes('non_field_errors') || err.message.includes('Unable to log in')) {
                    errorMessage = 'Invalid username or password'
                } else if (typeof err.message === 'string') {
                    errorMessage = err.message
                }
            }

            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#fff'
        }}>
            <div className="login-card" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '2rem',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <img src={logo} alt="Company Logo" style={{
                    width: '120px',
                    height: 'auto',
                    marginBottom: '1.5rem',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                }} />
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#fff' }}>Sign In</h2>

                {error && (
                    <div style={{
                        background: 'rgba(255, 87, 87, 0.1)',
                        border: '1px solid #ff5757',
                        color: '#ff5757',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a0a0a0' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '1rem'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a0a0a0' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '1rem'
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%)',
                            color: '#fff',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login
