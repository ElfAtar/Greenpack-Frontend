import React, { useState } from 'react'
import { useToast } from './ToastContainer'
import api from '../services/api'

export interface Box {
  id: string
  kutuKodu: string
  en: number
  boy: number
  yukseklik: number
}

interface BoxTableProps {
  boxes: Box[]
  onSave: (box: Box) => void
  onDelete: (boxId: string) => void
  savingId: string | null
  onImportClick?: () => void
  onAddNew: (box: Box) => void
  onDownloadClick?: () => void
}

type SortField = keyof Box
type SortDirection = 'asc' | 'desc'

const BoxTable: React.FC<BoxTableProps> = ({ boxes, onSave, onDelete, savingId, onAddNew, onDownloadClick }) => {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast()
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase()
  const asText = (input: unknown): string => String(input ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Box | null>(null)
  const [originalBoxKey, setOriginalBoxKey] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Box | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [newBox, setNewBox] = useState<Box>({
    id: '',
    kutuKodu: '',
    en: 0,
    boy: 0,
    yukseklik: 0
  })
  const [codeFilter, setCodeFilter] = useState('')
  const [dimensionFilter, setDimensionFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('kutuKodu')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortData = (data: Box[]) => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // Filter boxes based on code and dimensions
  const filteredBoxes = boxes.filter(box => {
    const codeMatch = normalizeText(box.kutuKodu).includes(normalizeText(codeFilter))
    const dimensionMatch = dimensionFilter === '' || 
      asText(box.en).includes(dimensionFilter) ||
      asText(box.boy).includes(dimensionFilter) ||
      asText(box.yukseklik).includes(dimensionFilter)
    return codeMatch && dimensionMatch
  })

  // Apply sorting to filtered data
  const sortedAndFilteredBoxes = sortData(filteredBoxes)

  const clearFilters = () => {
    setCodeFilter('')
    setDimensionFilter('')
  }

  const handleEdit = (box: Box) => {
    setEditingId(box.id)
    setEditData({ ...box })
    setOriginalBoxKey(box.kutuKodu)
  }

  const handleSave = () => {
    if (editData) {
      // Check if box key has changed
      if (originalBoxKey && editData.kutuKodu !== originalBoxKey) {
        showWarning('Kutu kodu değiştirilemez! Lütfen orijinal kutu kodunu kullanın.')
        return
      }
      
      onSave(editData)
      setEditingId(null)
      setEditData(null)
      setOriginalBoxKey(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData(null)
    setOriginalBoxKey(null)
  }

  const handleInputChange = (field: keyof Box, value: string | number) => {
    if (editData) {
      // Ensure numeric fields are non-negative
      if (typeof value === 'number' && value < 0) {
        value = 0
      }
      setEditData({ ...editData, [field]: value })
    }
  }

  const openDeleteModal = (box: Box) => {
    setDeleteTarget(box)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id)
      closeDeleteModal()
    }
  }

  const openAddModal = () => {
    setNewBox({
      id: '',
      kutuKodu: '',
      en: 0,
      boy: 0,
      yukseklik: 0
    })
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    setNewBox({
      id: '',
      kutuKodu: '',
      en: 0,
      boy: 0,
      yukseklik: 0
    })
  }

  const handleAddNewBox = () => {
    console.log('=== BUTTON CLICKED ===');
    console.log('New box data:', newBox);
    if (asText(newBox.kutuKodu).trim() === '') {
      showError('Kutu Kodu gereklidir!')
      return
    }
    
    if (newBox.en < 0 || newBox.boy < 0 || newBox.yukseklik < 0) {
      showError('En, Boy ve Yükseklik değerleri negatif olamaz!')
      return
    }
    
    if (newBox.en === 0 && newBox.boy === 0 && newBox.yukseklik === 0) {
      showError('En az bir boyut değeri girilmelidir!')
      return
    }

    // Check if box code already exists
    if (boxes.some(b => asText(b.kutuKodu) === asText(newBox.kutuKodu))) {
      showWarning('Bu kutu kodu zaten mevcuttur!')
      return
    }

    console.log('Validation passed, calling onAddNew');
    onAddNew(newBox)
    console.log('onAddNew called, closing modal');
    closeAddModal()
  }

  const handleModalImportClick = () => {
    modalFileInputRef.current?.click()
  }

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Reset the file input
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = ''
    }
    
    // Close the add modal first
    closeAddModal()
    
    // Upload file directly
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await api.post('box/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const data = response.data
      
      // Show success toast
      showSuccess(data.Message || 'Kutu başarıyla eklendi!')
      
      // Refresh box list via page reload for now
      window.location.reload()
      
    } catch (err: any) {
      showError('İçe aktarma başarısız: ' + (err.response?.data?.Message || err.message))
    }
  }

  const handleNewBoxInputChange = (field: keyof Box, value: string | number) => {
    // Ensure numeric fields are non-negative
    if (typeof value === 'number' && value < 0) {
      value = 0
    }
    setNewBox({ ...newBox, [field]: value })
  }

  const handleNewBoxInputFocus = (field: keyof Box) => {
    // Clear 0 values when focusing on numeric fields
    if (field !== 'kutuKodu' && newBox[field] === 0) {
      setNewBox({ ...newBox, [field]: '' })
    }
  }

  const handleNewBoxInputBlur = (field: keyof Box) => {
    // Restore 0 if field is empty on blur
    if (field !== 'kutuKodu' && newBox[field] === '') {
      setNewBox({ ...newBox, [field]: 0 })
    }
  }

  const renderCell = (box: Box, field: keyof Box) => {
    if (editingId === box.id && editData) {
      const value = editData[field]
      if (field === 'kutuKodu') {
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="edit-input"
          />
        )
      } else {
        return (
          <input
            type="number"
            step="0.1"
            min="0"
            value={value as number || ''}
            onChange={(e) => handleInputChange(field, parseFloat(e.target.value) || 0)}
            className="edit-input"
          />
        )
      }

    }
    return box[field] === 0 ? '' : box[field] || ''
  }

  const renderSortableHeader = (field: SortField, title: string) => {
    const isActive = sortField === field
    const isAsc = sortDirection === 'asc'
    
    return (
      <div className="sortable-header" onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
        <span>{title}</span>
        <div className="sort-indicators">
          <i className={`fa-solid fa-sort-up ${isActive && isAsc ? 'active' : ''}`}></i>
          <i className={`fa-solid fa-sort-down ${isActive && !isAsc ? 'active' : ''}`}></i>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer />
      <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Kutular</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="add-user-btn" onClick={openAddModal} title="Yeni kutu ekle">
            <i className="fa-solid fa-plus"></i>
          </button>
          <button className="add-user-btn" onClick={onDownloadClick} title="Excel dosyasını indir" style={{ backgroundColor: '#28a745' }}>
            <i className="fa-solid fa-download" style={{ color: '#ffffff' }}></i>
          </button>
        </div>
      </div>
      
      {/* Filter Section */}
      <div className="filter-section" style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '15px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Kutu Kodu
              {codeFilter && (
                <button
                  onClick={() => setCodeFilter('')}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  title="Bu filtreyi temizle"
                >
                  ✕
                </button>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Kutu koduna göre filtrele..."
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCodeFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: codeFilter ? '35px' : '12px',
                  border: codeFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {codeFilter && (
                <button
                  onClick={() => setCodeFilter('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6c757d',
                    fontSize: '14px',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Temizle (ESC)"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Boyutlar
              {dimensionFilter && (
                <button
                  onClick={() => setDimensionFilter('')}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  title="Bu filtreyi temizle"
                >
                  ✕
                </button>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="En, boy veya yüksekliğe göre filtrele..."
                value={dimensionFilter}
                onChange={(e) => setDimensionFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setDimensionFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: dimensionFilter ? '35px' : '12px',
                  border: dimensionFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {dimensionFilter && (
                <button
                  onClick={() => setDimensionFilter('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6c757d',
                    fontSize: '14px',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Temizle (ESC)"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(codeFilter || dimensionFilter) && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Tüm filtreleri temizle"
              >
                <span>✕</span>
                Filtreleri Temizle
              </button>
            )}
            <div style={{
              padding: '8px 12px',
              backgroundColor: filteredBoxes.length !== boxes.length ? '#fff3cd' : '#e7f3ff',
              border: filteredBoxes.length !== boxes.length ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: filteredBoxes.length !== boxes.length ? '#856404' : '#1565c0',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}>
              {filteredBoxes.length} / {boxes.length} kutu
              {(codeFilter || dimensionFilter) && (
                <span style={{ marginLeft: '5px', fontSize: '12px', opacity: 0.8 }}>
                  (filtrelenmiş)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="users-table-scroll">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                {renderSortableHeader('kutuKodu', 'Kutu Kodu')}
                {codeFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${codeFilter}`}></i>
                )}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('en', 'En (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('boy', 'Boy (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('yukseklik', 'Yükseklik (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredBoxes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  {boxes.length === 0 
                    ? 'Henüz kutu bulunmuyor.' 
                    : 'Filtre kriterlerine uygun kutu bulunamadı.'
                  }
                  {(codeFilter || dimensionFilter) && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={clearFilters}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sortedAndFilteredBoxes.map((box) => (
                <tr key={box.id}>
                  <td style={{ fontWeight: '500', color: '#2c3e50', fontFamily: 'monospace' }}>
                    {renderCell(box, 'kutuKodu')}
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #1976d2',
                      color: '#1976d2',
                      minWidth: '60px'
                    }}>
                      {renderCell(box, 'en')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#f3e5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #9c27b0',
                      color: '#9c27b0',
                      minWidth: '60px'
                    }}>
                      {renderCell(box, 'boy')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#e8f5e8',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #4caf50',
                      color: '#2e7d32',
                      minWidth: '60px'
                    }}>
                      {renderCell(box, 'yukseklik')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingId === box.id ? (
                      <>
                        <button className="action-btn" title="Kaydet" onClick={handleSave} disabled={savingId === box.id}>
                          {savingId === box.id ? (
                            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#28a745' }}></i>
                          ) : (
                            <i className="fa-solid fa-check" style={{ color: '#28a745' }}></i>
                          )}
                        </button>
                        <button className="action-btn" title="İptal" onClick={handleCancel} disabled={savingId === box.id}>
                          <i className="fa-solid fa-times" style={{ color: '#dc3545' }}></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn" title="Düzenle" onClick={() => handleEdit(box)}>
                          <i className="fa-solid fa-pen-to-square" style={{ color: '#40454f' }}></i>
                        </button>
                        <button className="action-btn" title="Sil" onClick={() => openDeleteModal(box)}>
                          <i className="fa-solid fa-trash" style={{ color: '#40454f' }}></i>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination and summary */}
      <div className="users-table-pagination" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px 0'
      }}>
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          Toplam {filteredBoxes.length} kutu gösteriliyor
          {filteredBoxes.length !== boxes.length && (
            <span> (toplam {boxes.length} kutudan filtrelendi)</span>
          )}
        </div>
        <div>
          <button className="pagination-btn" disabled>{'<'}</button>
          <span className="pagination-page">1</span>
          <button className="pagination-btn" disabled>{'>'}</button>
        </div>
      </div>
      
      {/* Add New Box Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Yeni Kutu Ekle</h3>
              <button
                type="button"
                onClick={handleModalImportClick}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
                title="Excel'den toplu kutu ekle"
              >
                <i className="fa-solid fa-file-excel"></i>
                Excel'den Aktar
              </button>
            </div>
            <input
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              ref={modalFileInputRef}
              onChange={handleModalFileChange}
            />
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kutu Kodu:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBox.kutuKodu}
                  onChange={(e) => handleNewBoxInputChange('kutuKodu', e.target.value)}
                  placeholder="Örn: 58x96x19"
                />
              </div>
              <div className="form-group">
                <label className="form-label">En:</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={newBox.en}
                  onChange={(e) => handleNewBoxInputChange('en', parseFloat(e.target.value) || 0)}
                  onFocus={() => handleNewBoxInputFocus('en')}
                  onBlur={() => handleNewBoxInputBlur('en')}
                  min="0"
                  placeholder="0.0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Boy:</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={newBox.boy}
                  onChange={(e) => handleNewBoxInputChange('boy', parseFloat(e.target.value) || 0)}
                  onFocus={() => handleNewBoxInputFocus('boy')}
                  onBlur={() => handleNewBoxInputBlur('boy')}
                  min="0"
                  placeholder="0.0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yükseklik:</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={newBox.yukseklik}
                  onChange={(e) => handleNewBoxInputChange('yukseklik', parseFloat(e.target.value) || 0)}
                  onFocus={() => handleNewBoxInputFocus('yukseklik')}
                  onBlur={() => handleNewBoxInputBlur('yukseklik')}
                  min="0"
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeAddModal}>İptal</button>
              <button type="button" className="btn-save" onClick={handleAddNewBox}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Kutuyu Sil</h3>
            </div>
            <div className="modal-body">
              <p><b>{deleteTarget.kutuKodu}</b> kutuyu silmek istediğinize emin misiniz?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>İptal</button>
              <button className="btn-delete" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default BoxTable  
