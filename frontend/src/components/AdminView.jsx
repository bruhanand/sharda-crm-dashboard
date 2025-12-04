import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import './AdminView.css'

const AdminView = () => {
    const [activeSection, setActiveSection] = useState('users')
    const [users, setUsers] = useState([])
    const [activityLogs, setActivityLogs] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // User management state
    const [showUserForm, setShowUserForm] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        is_active: true,
        is_staff: false
    })

    // Activity log filters
    const [logFilters, setLogFilters] = useState({
        user_id: '',
        action: '',
        start_date: '',
        end_date: ''
    })

    // Bulk delete state
    const [selectedLeads, setSelectedLeads] = useState([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    useEffect(() => {
        loadData()
    }, [activeSection])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        try {
            if (activeSection === 'users') {
                const usersData = await apiRequest('admin/users/')
                setUsers(usersData.results || usersData)
            } else if (activeSection === 'activity') {
                const params = {}
                if (logFilters.user_id) params.user_id = logFilters.user_id
                if (logFilters.action) params.action = logFilters.action
                if (logFilters.start_date) params.start_date = logFilters.start_date
                if (logFilters.end_date) params.end_date = logFilters.end_date

                const logsData = await apiRequest('admin/activity-logs/', { params })
                setActivityLogs(logsData.results || logsData)
            } else if (activeSection === 'data') {
                const statsData = await apiRequest('admin/stats/')
                setStats(statsData)
            }
        } catch (err) {
            setError(err.message || 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            await apiRequest('admin/users/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            })
            setShowUserForm(false)
            setUserForm({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                is_active: true,
                is_staff: false
            })
            loadData()
        } catch (err) {
            setError(err.message || 'Failed to create user')
        }
    }

    const handleUpdateUser = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            await apiRequest(`admin/users/${editingUser.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            })
            setEditingUser(null)
            setShowUserForm(false)
            setUserForm({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                is_active: true,
                is_staff: false
            })
            loadData()
        } catch (err) {
            setError(err.message || 'Failed to update user')
        }
    }

    const handleDeleteUser = async (userId, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
            return
        }
        setError(null)
        try {
            await apiRequest(`admin/users/${userId}/`, {
                method: 'DELETE'
            })
            loadData()
        } catch (err) {
            setError(err.message || 'Failed to delete user')
        }
    }

    const handleEditUser = (user) => {
        setEditingUser(user)
        setUserForm({
            username: user.username,
            email: user.email || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            password: '',
            is_active: user.is_active,
            is_staff: user.is_staff
        })
        setShowUserForm(true)
    }

    const handleBulkDeleteLeads = async () => {
        if (selectedLeads.length === 0) {
            alert('Please select leads to delete')
            return
        }

        setError(null)
        try {
            await apiRequest('admin/bulk-delete-leads/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_ids: selectedLeads })
            })
            setShowDeleteConfirm(false)
            setSelectedLeads([])
            alert(`Successfully deleted ${selectedLeads.length} leads`)
            loadData()
        } catch (err) {
            setError(err.message || 'Failed to delete leads')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '—'
        const date = new Date(dateString)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="admin-view">
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
                <p className="admin-subtitle">Manage users, monitor activity, and maintain data</p>
            </div>

            {error && (
                <div className="admin-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="admin-sections">
                <button
                    className={`admin-section-btn ${activeSection === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveSection('users')}
                >
                    👥 User Management
                </button>
                <button
                    className={`admin-section-btn ${activeSection === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveSection('activity')}
                >
                    📊 Activity Logs
                </button>
                {/* TODO: Uncomment to restore Data Management tab
                <button
                    className={`admin-section-btn ${activeSection === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveSection('data')}
                >
                    🗄️ Data Management
                </button>
                */}
            </div>

            {loading ? (
                <div className="admin-loading">Loading...</div>
            ) : (
                <div className="admin-content">
                    {activeSection === 'users' && (
                        <div className="users-section">
                            <div className="section-header">
                                <h2>Users</h2>
                                <button className="btn-primary" onClick={() => {
                                    setEditingUser(null)
                                    setUserForm({
                                        username: '',
                                        email: '',
                                        first_name: '',
                                        last_name: '',
                                        password: '',
                                        is_active: true,
                                        is_staff: false
                                    })
                                    setShowUserForm(true)
                                }}>
                                    + Add New User
                                </button>
                            </div>

                            {showUserForm && (
                                <form className="user-form" onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                                    <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Username *</label>
                                            <input
                                                type="text"
                                                value={userForm.username}
                                                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                                required
                                                disabled={editingUser !== null}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                value={userForm.email}
                                                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>First Name</label>
                                            <input
                                                type="text"
                                                value={userForm.first_name}
                                                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Last Name</label>
                                            <input
                                                type="text"
                                                value={userForm.last_name}
                                                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                                            <input
                                                type="password"
                                                value={userForm.password}
                                                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                                required={!editingUser}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={userForm.is_active}
                                                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                                                />
                                                Active Account
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label>Role</label>
                                            <select
                                                value={userForm.is_staff ? 'manager' : 'employee'}
                                                onChange={(e) => setUserForm({ ...userForm, is_staff: e.target.value === 'manager' })}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    border: '2px solid #e0e0e0',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem'
                                                }}
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="manager">Manager</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn-primary">
                                            {editingUser ? 'Update User' : 'Create User'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={() => {
                                            setShowUserForm(false)
                                            setEditingUser(null)
                                        }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Role</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td><strong>{user.username}</strong></td>
                                                <td>{user.email || '—'}</td>
                                                <td>{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : '—'}</td>
                                                <td>
                                                    <span className={`badge badge-${user.is_active ? 'success' : 'inactive'}`}>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${user.is_staff ? 'primary' : 'inactive'}`}>
                                                        {user.is_staff ? 'Manager' : 'Employee'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(user.date_joined)}</td>
                                                <td className="actions-cell">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handleEditUser(user)}
                                                        title="Edit user"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-danger"
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        title="Delete user"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="empty-state">No users found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === 'activity' && (
                        <div className="activity-section">
                            <div className="section-header">
                                <h2>Activity Logs</h2>
                            </div>

                            <div className="filters-row">
                                <select
                                    value={logFilters.user_id}
                                    onChange={(e) => setLogFilters({ ...logFilters, user_id: e.target.value })}
                                >
                                    <option value="">All Users</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>{user.username}</option>
                                    ))}
                                </select>
                                <select
                                    value={logFilters.action}
                                    onChange={(e) => setLogFilters({ ...logFilters, action: e.target.value })}
                                >
                                    <option value="">All Actions</option>
                                    <option value="login">Login</option>
                                    <option value="logout">Logout</option>
                                    <option value="create_lead">Create Lead</option>
                                    <option value="update_lead">Update Lead</option>
                                    <option value="delete_lead">Delete Lead</option>
                                    <option value="bulk_delete_leads">Bulk Delete</option>
                                    <option value="upload_file">Upload File</option>
                                </select>
                                <input
                                    type="date"
                                    value={logFilters.start_date}
                                    onChange={(e) => setLogFilters({ ...logFilters, start_date: e.target.value })}
                                    placeholder="Start Date"
                                />
                                <input
                                    type="date"
                                    value={logFilters.end_date}
                                    onChange={(e) => setLogFilters({ ...logFilters, end_date: e.target.value })}
                                    placeholder="End Date"
                                />
                                <button className="btn-primary" onClick={loadData}>Apply Filters</button>
                            </div>

                            <div className="table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Description</th>
                                            <th>IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{formatDate(log.timestamp)}</td>
                                                <td><strong>{log.username}</strong></td>
                                                <td>
                                                    <span className="badge badge-primary">{log.action_display}</span>
                                                </td>
                                                <td>{log.description || '—'}</td>
                                                <td><code>{log.ip_address || '—'}</code></td>
                                            </tr>
                                        ))}
                                        {activityLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="empty-state">No activity logs found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TODO: Uncomment to restore Data Management section
                    {activeSection === 'data' && stats && (
                        <div className="data-section">
                            <div className="section-header">
                                <h2>Data Management</h2>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Users</h3>
                                    <div className="stat-value">{stats.users.total}</div>
                                    <div className="stat-label">
                                        {stats.users.active} active, {stats.users.inactive} inactive
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <h3>Leads</h3>
                                    <div className="stat-value">{stats.leads.total}</div>
                                    <div className="stat-label">Total records in database</div>
                                </div>
                                <div className="stat-card">
                                    <h3>Activity</h3>
                                    <div className="stat-value">{stats.activities.total}</div>
                                    <div className="stat-label">Total activity logs</div>
                                </div>
                            </div>

                            <div className="data-management-panel">
                                <h3>⚠️ Danger Zone</h3>
                                <p>Bulk operations are <strong>irreversible</strong>. Please proceed with caution.</p>

                                <div className="danger-actions">
                                    <div className="danger-action-item">
                                        <div>
                                            <h4>Clear Activity Logs</h4>
                                            <p>Remove all activity log entries older than 90 days</p>
                                        </div>
                                        <button className="btn-danger" onClick={() => alert('Not implemented in this demo')}>
                                            Clear Old Logs
                                        </button>
                                    </div>
                                    <div className="danger-action-item">
                                        <div>
                                            <h4>Database Cleanup</h4>
                                            <p>Optimize database and remove orphaned records</p>
                                        </div>
                                        <button className="btn-danger" onClick={() => alert('Not implemented in this demo')}>
                                            Run Cleanup
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    */}
                </div>
            )}
        </div>
    )
}

export default AdminView
