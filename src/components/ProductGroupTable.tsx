import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { useToast } from './ToastContainer';
import { matchesQuery } from '../utils/search'
import HighlightedText from './HighlightedText'

export interface Product {
  productKey: string
  productName: string
  boxKey: string
  type: string
}

export interface ProductGroup {
  id: string
  groupName: string
  products: Product[]
  user: string
}

// Backend API format
export interface ApiProductGroup {
  id: string
  groupName: string
  productKeys: string[]
  user: string
  createdAt: string
}

interface ProductGroupTableProps {
  productGroups: ProductGroup[]
  onSave: (productGroup: ProductGroup) => void
  onDelete: (productGroupId: string) => void
  savingId?: string | null
  onAddNew?: (productGroup: ProductGroup) => void
}

const ProductGroupTable: React.FC<ProductGroupTableProps> = ({ 
  productGroups, 
  onSave: _onSave, 
  onDelete, 
  savingId: _savingId, 
  onAddNew 
}) => {
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase()
  const asText = (input: unknown): string => String(input ?? '')
  const { showError, showWarning, showSuccess: _showSuccess, ToastContainer } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductGroup | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [newProductGroup, setNewProductGroup] = useState<ProductGroup>({
    id: '',
    groupName: '',
    products: [],
    user: ''
  })
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  // Handle click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (addModalOpen && !target.closest('.modal-content') && !target.closest('.add-user-btn')) {
        closeAddModal()
      }
    }

    if (addModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [addModalOpen])

  // Fetch available products when component mounts
  useEffect(() => {
    api.get('products/all')
      .then(res => {
        const data = res.data
        const products = Array.isArray(data) ? data.map((p: any) => ({
          productKey: asText(p?.productKey),
          productName: asText(p?.productName),
          boxKey: asText(p?.boxKey),
          type: asText(p?.type)
        })).filter((p: Product) => p.productKey.trim() !== '') : []
        setAvailableProducts(products)
      })
      .catch((err: any) => {
        console.error('Error fetching products:', err)
      })
  }, [])

  // Ticking one checkbox at a time through the whole product list is what made creating a group
  // painful, so the picker is searchable on every field that identifies a product.
  const filteredAvailableProducts = useMemo(() => {
    const query = productSearch.trim()
    if (query === '') return availableProducts
    return availableProducts.filter(product =>
      matchesQuery([product.productName, product.productKey, product.boxKey, product.type], query))
  }, [availableProducts, productSearch])

  // Kept separate from the filtered list so a search never hides what is already selected.
  const selectedProductDetails = useMemo(
    () => availableProducts.filter(product => selectedProducts.includes(product.productKey)),
    [availableProducts, selectedProducts]
  )

  const allFilteredSelected = filteredAvailableProducts.length > 0 &&
    filteredAvailableProducts.every(product => selectedProducts.includes(product.productKey))

  const toggleFilteredSelection = () => {
    const filteredKeys = filteredAvailableProducts.map(product => product.productKey)
    setSelectedProducts(previous => allFilteredSelected
      ? previous.filter(key => !filteredKeys.includes(key))
      : Array.from(new Set([...previous, ...filteredKeys])))
  }

  // Filter product groups based on name and user
  const filteredProductGroups = productGroups.filter(productGroup => {
    const nameMatch = normalizeText(productGroup.groupName).includes(normalizeText(nameFilter))
    const userMatch = normalizeText(productGroup.user).includes(normalizeText(userFilter))
    return nameMatch && userMatch
  })

  const clearFilters = () => {
    setNameFilter('')
    setUserFilter('')
  }


  const openDeleteModal = (productGroup: ProductGroup) => {
    setDeleteTarget(productGroup)
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
    setNewProductGroup({
      id: '',
      groupName: '',
      products: [],
      user: ''
    })
    setSelectedProducts([])
    setProductSearch('')
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    setNewProductGroup({
      id: '',
      groupName: '',
      products: [],
      user: ''
    })
    setSelectedProducts([])
    setProductSearch('')
  }

  const handleAddNewProductGroup = () => {
    if (asText(newProductGroup.groupName).trim() === '') {
      showError('Grup adı gereklidir!')
      return
    }

    if (selectedProducts.length < 2) {
      showError('En az 2 ürün seçilmelidir!')
      return
    }

    // Check if group name already exists
    if (productGroups.some(pg => asText(pg.groupName) === asText(newProductGroup.groupName))) {
      showWarning('Bu grup adı zaten mevcuttur!')
      return
    }

    const newGroup: ProductGroup = {
      ...newProductGroup,
      products: selectedProductDetails
    }

    if (onAddNew) {
      onAddNew(newGroup)
      closeAddModal()
    }
  }

  const handleProductSelection = (productKey: string, checked: boolean) => {
    setSelectedProducts(previous => checked
      ? (previous.includes(productKey) ? previous : [...previous, productKey])
      : previous.filter(key => key !== productKey))
  }

  const renderCell = (productGroup: ProductGroup, field: keyof ProductGroup) => {
    
    if (field === 'products') {
      return productGroup.products?.map(p => p.productName).join(', ') || ''
    }
    
    return productGroup[field] || ''
  }

  return (
    <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Ürün Grupları</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="add-user-btn" onClick={openAddModal} title="Yeni ürün grubu ekle">
            <i className="fa-solid fa-plus"></i>
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
              Grup Adı
              {nameFilter && (
                <button
                  onClick={() => setNameFilter('')}
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
                placeholder="Grup adına göre filtrele..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNameFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: nameFilter ? '35px' : '12px',
                  border: nameFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {nameFilter && (
                <button
                  onClick={() => setNameFilter('')}
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
              Kullanıcı
              {userFilter && (
                <button
                  onClick={() => setUserFilter('')}
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
                placeholder="Kullanıcıya göre filtrele..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setUserFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: userFilter ? '35px' : '12px',
                  border: userFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {userFilter && (
                <button
                  onClick={() => setUserFilter('')}
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
            {(nameFilter || userFilter) && (
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
              backgroundColor: filteredProductGroups.length !== productGroups.length ? '#fff3cd' : '#e7f3ff',
              border: filteredProductGroups.length !== productGroups.length ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: filteredProductGroups.length !== productGroups.length ? '#856404' : '#1565c0',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}>
              {filteredProductGroups.length} / {productGroups.length} ürün grubu
              {(nameFilter || userFilter) && (
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
                Grup Adı
                {nameFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${nameFilter}`}></i>
                )}
              </th>
              <th style={{ minWidth: '300px' }}>
                Ürünler
              </th>
              <th>
                Kullanıcı
                {userFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${userFilter}`}></i>
                )}
              </th>
              <th style={{ textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredProductGroups.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  {productGroups.length === 0 
                    ? 'Henüz ürün grubu bulunmuyor.' 
                    : 'Filtre kriterlerine uygun ürün grubu bulunamadı.'
                  }
                  {(nameFilter || userFilter) && (
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
              filteredProductGroups.map(productGroup => (
                <tr key={productGroup.id}>
                  <td style={{ fontWeight: '500', color: '#2c3e50' }}>
                    {renderCell(productGroup, 'groupName')}
                  </td>
                  <td style={{ minWidth: '300px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {productGroup.products?.map((product, _index) => (
                        <span
                          key={product.productKey}
                          style={{
                            backgroundColor: '#e3f2fd',
                            borderRadius: '12px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            display: 'inline-block',
                            border: '1px solid #1976d2',
                            color: '#1976d2',
                            fontWeight: '500'
                          }}
                          title={`${product.productName} (${product.boxKey})`}
                        >
                          {product.productName}
                        </span>
                      )) || []}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      backgroundColor: '#f5f5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #e0e0e0',
                      minWidth: '100px',
                      color: '#495057',
                      fontWeight: '500'
                    }}>
                      {renderCell(productGroup, 'user')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="action-btn" title="Sil" onClick={() => openDeleteModal(productGroup)}>
                      <i className="fa-solid fa-trash" style={{ color: '#40454f' }}></i>
                    </button>
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
          Toplam {filteredProductGroups.length} ürün grubu gösteriliyor
          {filteredProductGroups.length !== productGroups.length && (
            <span> (toplam {productGroups.length} ürün grubundan filtrelendi)</span>
          )}
        </div>
        <div>
          <button className="pagination-btn" disabled>{'<'}</button>
          <span className="pagination-page">1</span>
          <button className="pagination-btn" disabled>{'>'}</button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Ürün Grubunu Sil</h3>
            </div>
            <div className="modal-body">
              <p><b>{deleteTarget.groupName}</b> ürün grubunu silmek istediğinize emin misiniz?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>İptal</button>
              <button className="btn-delete" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Group Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Yeni Ürün Grubu Ekle</h3>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Grup Adı *</label>
                  <input
                    type="text"
                    value={newProductGroup.groupName}
                    onChange={(e) => setNewProductGroup({ ...newProductGroup, groupName: e.target.value })}
                    className="form-input"
                    placeholder="Grup adını girin"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ürünler * (En az 2 ürün seçin)</label>

                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation()
                          setProductSearch('')
                        }
                      }}
                      placeholder="Ürün adı, ürün kodu, kutu kodu veya tip ile arayın..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        paddingRight: productSearch ? '35px' : '12px',
                        border: productSearch ? '2px solid #007bff' : '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: 'white'
                      }}
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        title="Temizle (ESC)"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6c757d',
                          fontSize: '14px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '13px', color: '#6c757d' }}>
                      {filteredAvailableProducts.length} / {availableProducts.length} ürün
                      {productSearch.trim() !== '' && ' (filtrelenmiş)'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={toggleFilteredSelection}
                        disabled={filteredAvailableProducts.length === 0}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #007bff',
                          backgroundColor: 'white',
                          color: '#007bff',
                          cursor: filteredAvailableProducts.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: filteredAvailableProducts.length === 0 ? 0.5 : 1
                        }}
                      >
                        {allFilteredSelected
                          ? 'Seçimi kaldır'
                          : productSearch.trim() !== '' ? 'Listelenenleri seç' : 'Tümünü seç'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProducts([])}
                        disabled={selectedProducts.length === 0}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #ced4da',
                          backgroundColor: 'white',
                          color: '#495057',
                          cursor: selectedProducts.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: selectedProducts.length === 0 ? 0.5 : 1
                        }}
                      >
                        Seçimi temizle
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '10px', 
                    maxHeight: '260px', 
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {filteredAvailableProducts.map(product => (
                      <label key={product.productKey} style={{ 
                        display: 'block', 
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: selectedProducts.includes(product.productKey) ? '#e3f2fd' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.productKey)}
                          onChange={(e) => handleProductSelection(product.productKey, e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>
                          <HighlightedText text={product.productName} query={productSearch} />
                        </span>
                        <span style={{ color: '#666', marginLeft: '8px', fontSize: '12px' }}>
                          <HighlightedText text={product.productKey} query={productSearch} />
                          {product.boxKey !== '' && (
                            <> · <HighlightedText text={product.boxKey} query={productSearch} /></>
                          )}
                          {product.type !== '' && (
                            <> · <HighlightedText text={product.type} query={productSearch} /></>
                          )}
                        </span>
                      </label>
                    ))}
                    {filteredAvailableProducts.length === 0 && (
                      <div style={{ padding: '12px', color: '#6c757d', fontStyle: 'italic', fontSize: '14px' }}>
                        {availableProducts.length === 0
                          ? 'Ürün listesi yüklenemedi.'
                          : 'Aramanızla eşleşen ürün bulunamadı.'}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                    Seçilen ürün sayısı: <b>{selectedProducts.length}</b>
                  </div>
                  {selectedProductDetails.length > 0 && (
                    <div style={{
                      marginTop: '6px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      maxHeight: '96px',
                      overflowY: 'auto'
                    }}>
                      {selectedProductDetails.map(product => (
                        <span
                          key={product.productKey}
                          title={`${product.productName} (${product.productKey})`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#e3f2fd',
                            border: '1px solid #1976d2',
                            color: '#1976d2',
                            borderRadius: '12px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {product.productName}
                          <button
                            type="button"
                            onClick={() => handleProductSelection(product.productKey, false)}
                            title="Seçimden çıkar"
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: '#1976d2',
                              fontSize: '11px',
                              lineHeight: 1
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeAddModal}>İptal</button>
              <button className="btn-save" onClick={handleAddNewProductGroup}>Ekle</button>
            </div>
          </div>
        </div>
       )}
       <ToastContainer />
     </div>
   )
 }
 
 export default ProductGroupTable
