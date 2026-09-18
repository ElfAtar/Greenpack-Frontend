import React, { useState } from 'react'
import UsersTable from '../components/UsersTable'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import EditUserModal from '../components/EditUserModal'
import AddUserModal from '../components/AddUserModal'
import type { User } from '../components/UsersTable'

const initialUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'admin', email: 'yazilim.test@abdiibrahim.com.tr', role: 'admin', active: true },
  { id: '2', username: 'elif.atar', fullName: 'Elif Atar', email: 'elifatar@optiprossoftware.com', role: 'user', active: true },
  { id: '3', username: 'testtest', fullName: 'test', email: 'test@abdiibrahim.com.tr', role: 'guest', active: true },
  { id: '4', username: 'eda.yucel', fullName: 'Eda Yucel', email: 'edayucel@optiprossoftware.com', role: 'guest', active: true },
  { id: '5', username: 'seray.cakirgil', fullName: 'Seray Çakırgil', email: 'seraycakirgil@gmail.com', role: 'guest', active: true },
]

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    user: User | null
  }>({
    isOpen: false,
    user: null
  })
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    user: User | null
  }>({
    isOpen: false,
    user: null
  })
  const [addModal, setAddModal] = useState({
    isOpen: false
  })

  const handleAdd = () => {
    setAddModal({ isOpen: true })
  }

  const handleEdit = (user: User) => {
    setEditModal({
      isOpen: true,
      user
    })
  }

  const handleDelete = (user: User) => {
    setDeleteModal({
      isOpen: true,
      user
    })
  }

  const confirmDelete = () => {
    if (deleteModal.user) {
      setUsers(users.filter(u => u.id !== deleteModal.user!.id))
      setDeleteModal({ isOpen: false, user: null })
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, user: null })
  }

  const saveEdit = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
    setEditModal({ isOpen: false, user: null })
  }

  const cancelEdit = () => {
    setEditModal({ isOpen: false, user: null })
  }

  const saveAdd = (newUser: Omit<User, 'id'>) => {
    const newId = (Math.max(...users.map(u => parseInt(u.id))) + 1).toString()
    const userToAdd: User = {
      ...newUser,
      id: newId
    }
    setUsers([...users, userToAdd])
    setAddModal({ isOpen: false })
  }

  const cancelAdd = () => {
    setAddModal({ isOpen: false })
  }

  return (
    <div className="main-content">
      <UsersTable
        users={users}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        userName={deleteModal.user?.username || ''}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <EditUserModal
        isOpen={editModal.isOpen}
        user={editModal.user}
        onSave={saveEdit}
        onCancel={cancelEdit}
      />

      <AddUserModal
        isOpen={addModal.isOpen}
        onSave={saveAdd}
        onCancel={cancelAdd}
      />
    </div>
  )
}

export default Users 