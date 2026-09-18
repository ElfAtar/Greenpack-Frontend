import React, { useState } from 'react';
import { useToast } from './ToastContainer';
import api from '../services/api'

export interface Carton {
  id: string;
  koliKodu: string;
  en: number;              // Width (outer)
  boy: number;             // Height (outer)  
  yukseklik: number;       // Thickness (outer)
  koliEn: number;          // En wall thickness
  koliBoy: number;         // Boy/depth wall thickness
  koliKalinlik: number;    // Height wall thickness
  agirlik: number;         // Weight
  koliMaliyet: number;     // CartonCost
  kgCo2: number;           // CO2 emissions in kg
}

interface CartonTableProps {
  cartons: Carton[];
  onSave: (carton: Carton) => void;
  onDelete: (cartonId: string) => void;
  savingId: string | null;
  onImportClick?: () => void;
  onAddNew: (carton: Carton) => void;
  onDownloadClick?: () => void;
  onRefresh?: () => void;
}

type SortField = keyof Carton;
type SortDirection = 'asc' | 'desc';

const CartonTable: React.FC<CartonTableProps> = ({ cartons, onSave, onDelete, savingId, onAddNew, onDownloadClick, onRefresh }) => {
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase();
  const asText = (input: unknown): string => String(input ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Carton | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Carton | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { showError, showWarning, showSuccess, ToastContainer } = useToast();
  const [newCarton, setNewCarton] = useState<Carton>({
    id: '',
    koliKodu: '',
    en: 0,
    boy: 0,
    yukseklik: 0,
    koliEn: 0,
    koliBoy: 0,
    koliKalinlik: 0,
    agirlik: 0,
    koliMaliyet: 0,
    kgCo2: 0,
  });
  const [codeFilter, setCodeFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('koliKodu');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortData = (data: Carton[]) => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Filter cartons based on code
  const filteredCartons = cartons.filter(carton => {
    const codeMatch = normalizeText(carton.koliKodu).includes(normalizeText(codeFilter));
    return codeMatch;
  });

  // Apply sorting to filtered data
  const sortedAndFilteredCartons = sortData(filteredCartons);

  const clearFilters = () => {
    setCodeFilter('');
  };

  const handleEdit = (carton: Carton) => {
    setEditingId(carton.id);
    setEditData({ ...carton });
  };

  const handleSave = () => {
    if (editData) {
      onSave(editData);
      setEditingId(null);
      setEditData(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleInputChange = (field: keyof Carton, value: string | number) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const openDeleteModal = (carton: Carton) => {
    setDeleteTarget(carton);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      closeDeleteModal();
    }
  };

  const openAddModal = () => {
    setNewCarton({
      id: '',
      koliKodu: '',
      en: 0,
      boy: 0,
      yukseklik: 0,
      koliEn: 0,
      koliBoy: 0,
      koliKalinlik: 0,
      agirlik: 0,
      koliMaliyet: 0,
      kgCo2: 0,
    });
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setNewCarton({
      id: '',
      koliKodu: '',
      en: 0,
      boy: 0,
      yukseklik: 0,
      koliEn: 0,
      koliBoy: 0,
      koliKalinlik: 0,
      agirlik: 0,
      koliMaliyet: 0,
      kgCo2: 0,
    });
  };

  const handleAddNewCarton = () => {
    if (asText(newCarton.koliKodu).trim() === '') {
      showError('Koli Kodu gereklidir!');
      return;
    }
    if (newCarton.en <= 0 || newCarton.boy <= 0 || newCarton.yukseklik <= 0) {
      showError('İç boyutlar (En, Boy, Yükseklik) 0\'dan büyük olmalıdır!');
      return;
    }
    if (cartons.some(c => asText(c.koliKodu) === asText(newCarton.koliKodu))) {
      showWarning('Bu koli kodu zaten mevcuttur!');
      return;
    }
    onAddNew(newCarton);
    closeAddModal();
  };

  const handleModalImportClick = () => {
    modalFileInputRef.current?.click();
  };

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
    
    closeAddModal();
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('carton/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = response.data;
      
      showSuccess(data.Message || 'Koli başarıyla eklendi!');
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (err: any) {
      showError('İçe aktarma başarısız: ' + (err.response?.data?.Message || err.message));
    }
  };

  const handleNewCartonInputChange = (field: keyof Carton, value: string | number) => {
    setNewCarton({ ...newCarton, [field]: value });
  };

  const handleNewCartonInputFocus = (field: keyof Carton) => {
    if (newCarton[field] === 0) {
      setNewCarton({ ...newCarton, [field]: '' });
    }
  };

  const handleNewCartonInputBlur = (field: keyof Carton) => {
    if (newCarton[field] === '') {
      setNewCarton({ ...newCarton, [field]: 0 });
    }
  };

  const renderCell = (carton: Carton, field: keyof Carton) => {
    if (editingId === carton.id && editData) {
      const value = editData[field];
      if (field === 'koliKodu') {
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="edit-input"
          />
        );
      } else {
        // Use different step values for different fields
        const stepValue = field === 'kgCo2' ? '0.001' : 
                         field === 'koliMaliyet' ? '0.01' : '0.1';
        return (
          <input
            type="number"
            step={stepValue}
            value={value as number || ''}
            onChange={(e) => handleInputChange(field, parseFloat(e.target.value) || 0)}
            className="edit-input"
          />
        );
      }
    }
    return carton[field] || '';
  };

  const renderSortableHeader = (field: SortField, title: string) => {
    const isActive = sortField === field;
    const isAsc = sortDirection === 'asc';
    return (
      <div className="sortable-header" onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
        <span>{title}</span>
        <div className="sort-indicators">
          <i className={`fa-solid fa-sort-up ${isActive && isAsc ? 'active' : ''}`}></i>
          <i className={`fa-solid fa-sort-down ${isActive && !isAsc ? 'active' : ''}`}></i>
        </div>
      </div>
    );
  };

  return (
    <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Koliler</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="add-user-btn" onClick={openAddModal} title="Yeni koli ekle">
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
              Koli Kodu
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
                placeholder="Koli koduna göre filtrele..."
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
          
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {codeFilter && (
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
              backgroundColor: filteredCartons.length !== cartons.length ? '#fff3cd' : '#e7f3ff',
              border: filteredCartons.length !== cartons.length ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: filteredCartons.length !== cartons.length ? '#856404' : '#1565c0',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}>
              {filteredCartons.length} / {cartons.length} koli
              {codeFilter && (
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
                {renderSortableHeader('koliKodu', 'Koli Kodu')}
                {codeFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${codeFilter}`}></i>
                )}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('en', 'İç En (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('boy', 'İç Boy (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('yukseklik', 'İç Yükseklik (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('koliEn', 'En Kalınlık (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('koliBoy', 'Boy Kalınlık (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('koliKalinlik', 'Yükseklik Kalınlık (mm)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('agirlik', 'Ağırlık (g)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('koliMaliyet', 'Maliyet (₺)')}
              </th>
              <th style={{ textAlign: 'center' }}>
                {renderSortableHeader('kgCo2', 'CO2e (kg)')}
              </th>
              <th style={{ textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredCartons.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  {cartons.length === 0 
                    ? 'Henüz koli bulunmuyor.' 
                    : 'Filtre kriterlerine uygun koli bulunamadı.'
                  }
                  {codeFilter && (
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
              sortedAndFilteredCartons.map((carton) => (
                <tr key={carton.id}>
                  <td style={{ fontWeight: '500', color: '#2c3e50', fontFamily: 'monospace' }}>
                    {renderCell(carton, 'koliKodu')}
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
                      {renderCell(carton, 'en')}
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
                      {renderCell(carton, 'boy')}
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
                      {renderCell(carton, 'yukseklik')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#fff3e0',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #ff9800',
                      color: '#e65100',
                      minWidth: '60px'
                    }}>
                      {renderCell(carton, 'koliEn')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#fce4ec',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #e91e63',
                      color: '#ad1457',
                      minWidth: '60px'
                    }}>
                      {renderCell(carton, 'koliBoy')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#e0f2f1',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #009688',
                      color: '#00695c',
                      minWidth: '60px'
                    }}>
                      {renderCell(carton, 'koliKalinlik')}
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
                      {renderCell(carton, 'agirlik')}
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
                      {renderCell(carton, 'koliMaliyet')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: '#fff3e0',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      border: '1px solid #ff9800',
                      color: '#e65100',
                      minWidth: '60px'
                    }}>
                      {renderCell(carton, 'kgCo2')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingId === carton.id ? (
                      <>
                        <button className="action-btn" title="Kaydet" onClick={handleSave} disabled={savingId === carton.id}>
                          {savingId === carton.id ? (
                            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#28a745' }}></i>
                          ) : (
                            <i className="fa-solid fa-check" style={{ color: '#28a745' }}></i>
                          )}
                        </button>
                        <button className="action-btn" title="İptal" onClick={handleCancel} disabled={savingId === carton.id}>
                          <i className="fa-solid fa-times" style={{ color: '#dc3545' }}></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn" title="Düzenle" onClick={() => handleEdit(carton)}>
                          <i className="fa-solid fa-pen-to-square" style={{ color: '#40454f' }}></i>
                        </button>
                        <button className="action-btn" title="Sil" onClick={() => openDeleteModal(carton)}>
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
          Toplam {filteredCartons.length} koli gösteriliyor
          {filteredCartons.length !== cartons.length && (
            <span> (toplam {cartons.length} koliden filtrelendi)</span>
          )}
        </div>
        <div>
          <button className="pagination-btn" disabled>{'<'}</button>
          <span className="pagination-page">1</span>
          <button className="pagination-btn" disabled>{'>'}</button>
        </div>
      </div>
      
      {/* Add New Carton Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Yeni Koli Ekle</h3>
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
                title="Excel'den toplu koli ekle"
              >
                <i className="fa-solid fa-file-excel"></i>
                Excel'den Ekle
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
                <label className="form-label">Koli Kodu:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCarton.koliKodu}
                  onChange={(e) => handleNewCartonInputChange('koliKodu', e.target.value)}
                  placeholder="Örn: KL-1"
                />
              </div>
              
              <div className="form-section">
                <h4 style={{ margin: '15px 0 10px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>İç Boyutlar</h4>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">İç En (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.en}
                      onChange={(e) => handleNewCartonInputChange('en', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('en')}
                      onBlur={() => handleNewCartonInputBlur('en')}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">İç Boy (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.boy}
                      onChange={(e) => handleNewCartonInputChange('boy', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('boy')}
                      onBlur={() => handleNewCartonInputBlur('boy')}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">İç Yükseklik (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.yukseklik}
                      onChange={(e) => handleNewCartonInputChange('yukseklik', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('yukseklik')}
                      onBlur={() => handleNewCartonInputBlur('yukseklik')}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 style={{ margin: '15px 0 10px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>Kalınlık Boyutları</h4>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">En Kalınlık (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.koliEn}
                      onChange={(e) => handleNewCartonInputChange('koliEn', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('koliEn')}
                      onBlur={() => handleNewCartonInputBlur('koliEn')}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Boy Kalınlık (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.koliBoy}
                      onChange={(e) => handleNewCartonInputChange('koliBoy', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('koliBoy')}
                      onBlur={() => handleNewCartonInputBlur('koliBoy')}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yükseklik Kalınlık (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.koliKalinlik}
                      onChange={(e) => handleNewCartonInputChange('koliKalinlik', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('koliKalinlik')}
                      onBlur={() => handleNewCartonInputBlur('koliKalinlik')}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 style={{ margin: '15px 0 10px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>Diğer Özellikler</h4>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Ağırlık (g):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={newCarton.agirlik}
                      onChange={(e) => handleNewCartonInputChange('agirlik', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('agirlik')}
                      onBlur={() => handleNewCartonInputBlur('agirlik')}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maliyet (₺):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={newCarton.koliMaliyet}
                      onChange={(e) => handleNewCartonInputChange('koliMaliyet', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('koliMaliyet')}
                      onBlur={() => handleNewCartonInputBlur('koliMaliyet')}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CO2e (kg):</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-input"
                      value={newCarton.kgCo2}
                      onChange={(e) => handleNewCartonInputChange('kgCo2', parseFloat(e.target.value) || 0)}
                      onFocus={() => handleNewCartonInputFocus('kgCo2')}
                      onBlur={() => handleNewCartonInputBlur('kgCo2')}
                      placeholder="0.000"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeAddModal}>İptal</button>
              <button type="button" className="btn-save" onClick={handleAddNewCarton}>Ekle</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Koliyi Sil</h3>
            </div>
            <div className="modal-body">
              <p><b>{deleteTarget.koliKodu}</b> koliyi silmek istediğinize emin misiniz?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeDeleteModal}>İptal</button>
              <button type="button" className="btn-delete" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default CartonTable; 
