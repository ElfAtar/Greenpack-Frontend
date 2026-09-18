import React, { useState } from 'react'

export interface User {
  id: string
  username: string
  fullName: string
  email: string
  role: 'admin' | 'user' | 'guest'
  active: boolean
}

interface UsersTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAdd: () => void
}

const UsersTable: React.FC<UsersTableProps> = ({ users, onEdit, onDelete, onAdd }) => {
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const filteredUsers = users.filter(
    u => {
      const normalizedSearch = normalizeText(search)
      const matchesSearch = 
        normalizeText(u.username).includes(normalizedSearch) ||
        normalizeText(u.fullName).includes(normalizedSearch) ||
        normalizeText(u.email).includes(normalizedSearch)
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesActive = activeFilter === 'all' || 
        (activeFilter === 'active' && u.active) ||
        (activeFilter === 'inactive' && !u.active)
      
      return matchesSearch && matchesRole && matchesActive
    }
  )

  // Sort users: active users first (alphabetically), then inactive users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // First, sort by active status (active users first)
    if (a.active && !b.active) return -1
    if (!a.active && b.active) return 1
    
    // If both have the same active status, sort alphabetically by username
    return a.username.localeCompare(b.username)
  })

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'user': return 'User'
      case 'guest': return 'Guest'
      default: return role
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setActiveFilter('all')
  }

  return (
    <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Kullanıcılar</h2>
        <button className="add-user-btn" onClick={onAdd} title="Yeni kullanıcı ekle">
          +
        </button>
      </div>
      <div className="users-table-filter-row">
        <div className="filter-container">
          <div className="filter-input-container">
            <input
              className="users-table-filter"
              type="text"
              placeholder="Filtre"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="filter-icon">
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#aeb3bc' }}></i>
            </span>
          </div>
          
          <div className="filter-dropdowns">
            <select
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Tüm Roller</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="guest">Guest</option>
            </select>
            
            <select
              className="filter-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">Etkinlik</option>
              <option value="active">Etkin</option>
              <option value="inactive">Etkin Değil</option>
            </select>
            
            <button className="clear-filters-btn" onClick={clearFilters}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="users-table-scroll">
        <table className="users-table">
          <thead>
            <tr>
              <th>Kullanıcı adı</th>
              <th>Tam adı</th>
              <th>E-posta adresi</th>
              <th>Rol</th>
              <th>Etkin mi?</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </td>
                <td>
                  {user.active ? (
                    <span className="active-badge">Evet</span>
                  ) : (
                    <span className="inactive-badge">Hayır</span>
                  )}
                </td>
                <td>
                  <button className="action-btn" title="Düzenle" onClick={() => onEdit(user)}>
                    <i className="fa-solid fa-user-pen" style={{ color: '#40454f' }}></i>
                  </button>
                  <button className="action-btn" title="Sil" onClick={() => onDelete(user)}>
                    <i className="fa-solid fa-trash" style={{ color: '#40454f' }}></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination placeholder */}
      <div className="users-table-pagination">
        <button className="pagination-btn" disabled>{'<'}</button>
        <span className="pagination-page">1</span>
        <button className="pagination-btn" disabled>{'>'}</button>
      </div>
    </div>
  )
}

export default UsersTable 
