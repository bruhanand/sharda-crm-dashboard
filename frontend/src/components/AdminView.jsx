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

    // User delete confirmation
    const [userToDelete, setUserToDelete] = useState(null)

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

    const handleDeleteUser = (userId, username) => {
        // Show custom confirmation modal
        setUserToDelete({ id: userId, username })
    }

    const confirmDeleteUser = async () => {
        if (!userToDelete) return

        setError(null)
        try {
            console.log(`Deleting user ${userToDelete.id} (${userToDelete.username})`)
            await apiRequest(`admin/users/${userToDelete.id}/`, {
                method: 'DELETE'
            })
            console.log(`User "${userToDelete.username}" deleted successfully`)
            setUserToDelete(null)
            // Refresh the user list
            loadData()
        } catch (err) {
            console.error('Delete error:', err)
            const errorMsg = err.message || 'Failed to delete user'
            setError(errorMsg)
            setUserToDelete(null)
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
                                                        className="btn-icon btn-edit"
                                                        onClick={() => handleEditUser(user)}
                                                        title="Edit user"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <path d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1757 2.17513 14.3146 2.383 14.4094 2.61178C14.5042 2.84055 14.5529 3.08575 14.5529 3.33337C14.5529 3.58099 14.5042 3.82619 14.4094 4.05497C14.3146 4.28374 14.1757 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                    {/* Don't show delete button for admin user */}
                                                    {user.username !== 'admin' && (
                                                        <button
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                                            title="Delete user"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                                <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </button>
                                                    )}
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

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="delete-modal-overlay" onClick={() => setUserToDelete(null)}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">⚠️</div>
                        <h3>Delete User?</h3>
                        <p>
                            Are you sure you want to delete user <span className="delete-modal-username">"{userToDelete.username}"</span>?
                            <br /><br />
                            This action cannot be undone and will permanently remove all data associated with this user.
                        </p>
                        <div className="delete-modal-actions">
                            <button className="btn-danger" onClick={confirmDeleteUser}>
                                Delete User
                            </button>
                            <button className="btn-secondary" onClick={() => setUserToDelete(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminView
