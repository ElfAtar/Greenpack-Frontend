import React, { useState, useEffect, useRef } from 'react'
import { useToast } from './ToastContainer'
import api from '../services/api'

// Helper function to translate cartoning method from English to Turkish
const translateCartoningMethod = (method: string): string => {
  if (!method) return 'N/A';
  const lowerMethod = method.toLowerCase();
  if (lowerMethod === 'machine') return 'Makine Kolileme';
  if (lowerMethod === 'hand') return 'Manuel Kolileme';
  return method; // Return original if not recognized
};

// Fixed pallet sizes (select-only — not derived from existing products)
const PALLET_OPTIONS = ['80x120', '100x120']

// Searchable Dropdown Component
interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  allowCustom?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  className = "form-select",
  allowCustom = false
}) => {
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  useEffect(() => {
    const filtered = options.filter(option =>
      normalizeText(option).includes(normalizeText(searchTerm))
    );
    setFilteredOptions(filtered);
  }, [options, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  const commitCustom = () => {
    const trimmed = searchTerm.trim();
    if (trimmed === '') return;
    onChange(trimmed);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allowCustom && e.key === 'Enter') {
      e.preventDefault();
      commitCustom();
    }
  };

  const trimmedSearch = searchTerm.trim();
  const hasExactMatch = options.some(option => normalizeText(option) === normalizeText(trimmedSearch));
  const showCustomEntry = allowCustom && trimmedSearch !== '' && !hasExactMatch;

  const displayValue = value || placeholder;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        style={{ 
          width: '100%',
          paddingRight: '30px',
          cursor: 'pointer'
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#666'
        }}
      >
        {isOpen ? '▲' : '▼'}
      </div>
      
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => handleSelect(option)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < filteredOptions.length - 1 || showCustomEntry ? '1px solid #eee' : 'none',
                backgroundColor: option === value ? '#e3f2fd' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (option !== value) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (option !== value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {option}
            </div>
          ))}
          {showCustomEntry && (
            <div
              onClick={commitCustom}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#1976d2',
                fontWeight: 500
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              + "{trimmedSearch}" ekle
            </div>
          )}
          {filteredOptions.length === 0 && !showCustomEntry && (
            <div style={{ padding: '8px 12px', color: '#666', fontStyle: 'italic' }}>
              {allowCustom ? 'Yazarak yeni değer ekleyin' : 'No options found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface Product {
  id: string
  urunAdi: string
  sapKodu: string
  tip: string
  kolilemeYontemi: string
  kutu: string
  bundle: string
  koli: string
  kl: string
  pallet: string
  nbox: number | null
  nkoli: number | null
  nBundle: number | null
}

interface ProductTableProps {
  products: Product[]
  onSave: (product: Product) => void
  onDelete: (productId: string) => void
  savingId?: string | null
  onImportClick?: () => void
  onAddNew?: (product: Product) => void
  onDownloadClick?: () => void
  onRefresh?: () => void
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onSave, onDelete, savingId, onAddNew, onDownloadClick, onRefresh }) => {
  const { showError, showWarning, showSuccess, ToastContainer } = useToast()
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Product | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const modalFileInputRef = useRef<HTMLInputElement | null>(null)
  
  // Dropdown data state
  const [tipOptions, setTipOptions] = useState<string[]>([])
  const [kutuOptions, setKutuOptions] = useState<string[]>([])
  const [klOptions, setKlOptions] = useState<string[]>([])
  const [newProduct, setNewProduct] = useState<Product>({
    id: '',
    urunAdi: '',
    sapKodu: '',
    tip: '',
    kolilemeYontemi: 'makine',
    kutu: '',
    bundle: 'YOK',
    koli: 'YOK',
    kl: '',
    pallet: '',
    nbox: null,
    nkoli: null,
    nBundle: null
  })
  const [nameFilter, setNameFilter] = useState('')
  const [sapFilter, setSapFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Fetch dropdown data on component mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch boxes for Kutu dropdown
        const boxesResponse = await api.get('box/all')
        console.log('Boxes response status:', boxesResponse.status)
        const boxes = boxesResponse.data
        console.log('Boxes data:', boxes)
        const boxKeys = boxes.map((box: any) => box.boxKey).filter(Boolean)
        console.log('Box keys:', boxKeys)
        setKutuOptions(boxKeys)

        // Fetch cartons for KL dropdown
        const cartonsResponse = await api.get('carton/all')
        console.log('Cartons response status:', cartonsResponse.status)
        const cartons = cartonsResponse.data
        console.log('Cartons data:', cartons)
        const cartonKeys = cartons
          .map((carton: any) => carton.cartonKey ?? carton.CartonKey)
          .filter((key: any) => typeof key === 'string' && key.trim() !== '')
        console.log('Carton keys:', cartonKeys)
        setKlOptions(cartonKeys)

        // Fetch products to get unique Tip values
        const productsResponse = await api.get('products/all')
        console.log('Products response status:', productsResponse.status)
        const allProducts = productsResponse.data
        console.log('Products data:', allProducts)
        const uniqueTips = [...new Set(allProducts.map((product: any) => product.type).filter(Boolean))] as string[]
        console.log('Unique tips:', uniqueTips)
        setTipOptions(uniqueTips)
        // Pallet uses a fixed list (PALLET_OPTIONS), not derived from products.
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
      }
    }

    fetchDropdownData()
  }, [])

  // Debug: Log dropdown options when they change
  useEffect(() => {
    console.log('Kutu options updated:', kutuOptions)
  }, [kutuOptions])

  useEffect(() => {
    console.log('KL options updated:', klOptions)
  }, [klOptions])

  useEffect(() => {
    console.log('Tip options updated:', tipOptions)
  }, [tipOptions])

  // Filter products based on name, SAP code, and type
  const filteredProducts = products.filter(product => {
    const nameMatch = normalizeText(product.urunAdi).includes(normalizeText(nameFilter))
    const sapMatch = normalizeText(product.sapKodu).includes(normalizeText(sapFilter))
    const typeMatch = normalizeText(product.tip).includes(normalizeText(typeFilter))
    return nameMatch && sapMatch && typeMatch
  })

  const clearFilters = () => {
    setNameFilter('')
    setSapFilter('')
    setTypeFilter('')
  }



  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setEditData({ ...product })
  }

  const handleSave = () => {
    if (editData) {
      onSave(editData)
      setEditingId(null)
      setEditData(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleInputChange = (field: keyof Product, value: string | number | null) => {
    if (editData) {
      // Ensure numeric fields are non-negative
      if (typeof value === 'number' && value < 0) {
        value = 0
      }
      setEditData({ ...editData, [field]: value })
    }
  }

  const openDeleteModal = (product: Product) => {
    setDeleteTarget(product)
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
    setNewProduct({
      id: '',
      urunAdi: '',
      sapKodu: '',
      tip: '',
      kolilemeYontemi: 'makine',
      kutu: '',
      bundle: 'YOK',
      koli: 'YOK',
      kl: '',
      pallet: '',
      nbox: null,
      nkoli: null,
      nBundle: null
    })
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    setNewProduct({
      id: '',
      urunAdi: '',
      sapKodu: '',
      tip: '',
      kolilemeYontemi: 'makine',
      kutu: '',
      bundle: 'YOK',
      koli: 'YOK',
      kl: '',
      pallet: '',
      nbox: null,
      nkoli: null,
      nBundle: null
    })
  }

  const handleAddNewProduct = () => {
    if (newProduct.urunAdi.trim() === '') {
      showError('Ürün Adı gereklidir!')
      return
    }

    // Check if product name already exists
    if (products.some(p => p.urunAdi === newProduct.urunAdi)) {
      showWarning('Bu ürün adı zaten mevcuttur!')
      return
    }

    if (onAddNew) {
      onAddNew(newProduct)
      closeAddModal()
    }
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
    
    // Upload the file directly from here
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await api.post('products/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const data = response.data
      
      // Show success message
      const message = data.Message || 'Ürün başarıyla eklendi!'
      showSuccess(message)
      
      // Refresh the products list via parent callback
      if (onRefresh) {
        onRefresh()
      }
      
    } catch (err: any) {
      showError('İçe aktarma başarısız: ' + (err.response?.data?.Message || err.message))
    }
  }

  const handleNewProductInputChange = (field: keyof Product, value: string | number | null) => {
    // Ensure numeric fields are non-negative
    if (typeof value === 'number' && value < 0) {
      value = 0
    }
    
    // Clear KL field when Koli is set to YOK
    if (field === 'koli' && value === 'YOK') {
      setNewProduct({ ...newProduct, [field]: value, kl: '' })
    } else {
      setNewProduct({ ...newProduct, [field]: value })
    }
  }

  const renderCell = (product: Product, field: keyof Product) => {
    if (editingId === product.id && editData) {
      const value = editData[field]
      if (field === 'urunAdi' || field === 'sapKodu' || field === 'tip' || field === 'kolilemeYontemi' || field === 'kutu' || field === 'bundle' || field === 'koli' || field === 'kl' || field === 'pallet') {
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
            min="0"
            value={value as number || ''}
            onChange={(e) => handleInputChange(field, e.target.value ? Number(e.target.value) : null)}
            className="edit-input"
          />
        )
      }
    }
    return product[field] || ''
  }



  return (
    <>
      <ToastContainer />
      <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Ürünler</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="add-user-btn" onClick={openAddModal} title="Yeni ürün ekle">
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
              Ürün Adı
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
                placeholder="Ürün adına göre filtrele..."
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
              SAP Kodu
              {sapFilter && (
                <button
                  onClick={() => setSapFilter('')}
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
                placeholder="SAP koduna göre filtrele..."
                value={sapFilter}
                onChange={(e) => setSapFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSapFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: sapFilter ? '35px' : '12px',
                  border: sapFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {sapFilter && (
                <button
                  onClick={() => setSapFilter('')}
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
              Tip
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter('')}
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
                placeholder="Tipe göre filtrele..."
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTypeFilter('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: typeFilter ? '35px' : '12px',
                  border: typeFilter ? '2px solid #007bff' : '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter('')}
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
            {(nameFilter || sapFilter || typeFilter) && (
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
              backgroundColor: filteredProducts.length !== products.length ? '#fff3cd' : '#e7f3ff',
              border: filteredProducts.length !== products.length ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: filteredProducts.length !== products.length ? '#856404' : '#1565c0',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}>
              {filteredProducts.length} / {products.length} ürün
              {(nameFilter || sapFilter || typeFilter) && (
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
                Ürün Adı
                {nameFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${nameFilter}`}></i>
                )}
              </th>
              <th>
                SAP Kodu
                {sapFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${sapFilter}`}></i>
                )}
              </th>
              <th>
                Tip
                {typeFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${typeFilter}`}></i>
                )}
              </th>
              <th style={{ textAlign: 'center' }}>Kolileme Yöntemi</th>
              <th style={{ textAlign: 'center' }}>Kutu</th>
              <th style={{ textAlign: 'center' }}>Bundle</th>
              <th style={{ textAlign: 'center' }}>Koli</th>
              <th style={{ textAlign: 'center' }}>KL</th>
              <th style={{ textAlign: 'center' }}>Pallet</th>
              <th style={{ textAlign: 'center' }}>Palet İçi Kutu</th>
              <th style={{ textAlign: 'center' }}>Palet İçi Koli</th>
              <th style={{ textAlign: 'center' }}>Palet İçi Bundle</th>
              <th style={{ textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={13} style={{
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  {products.length === 0 
                    ? 'Henüz ürün bulunmuyor.' 
                    : 'Filtre kriterlerine uygun ürün bulunamadı.'
                  }
                  {(nameFilter || sapFilter || typeFilter) && (
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
              filteredProducts.map(product => (
              <tr key={product.id}>
                  <td style={{ fontWeight: '500', color: '#2c3e50' }}>{renderCell(product, 'urunAdi')}</td>
                  <td style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa' }}>{renderCell(product, 'sapKodu')}</td>
                  <td>
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #1976d2',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: '#1976d2'
                    }}>
                      {renderCell(product, 'tip')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#f3e5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #9c27b0',
                      minWidth: '120px',
                      fontWeight: '500',
                      color: '#9c27b0'
                    }}>
                      {editingId === product.id && editData ? 
                        renderCell(product, 'kolilemeYontemi') : 
                        translateCartoningMethod(product.kolilemeYontemi)
                      }
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#f3e5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #9c27b0',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: '#9c27b0'
                    }}>
                      {renderCell(product, 'kutu')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: product.bundle === 'VAR' ? '#e8f5e8' : '#f5f5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: product.bundle === 'VAR' ? '1px solid #4caf50' : '1px solid #e0e0e0',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: product.bundle === 'VAR' ? '#2e7d32' : '#6c757d'
                    }}>
                      {renderCell(product, 'bundle')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: product.koli === 'VAR' ? '#e8f5e8' : '#f5f5f5',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: product.koli === 'VAR' ? '1px solid #4caf50' : '1px solid #e0e0e0',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: product.koli === 'VAR' ? '#2e7d32' : '#6c757d'
                    }}>
                      {renderCell(product, 'koli')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#fff3e0',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #ff9800',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: '#e65100'
                    }}>
                      {renderCell(product, 'kl')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#e8f5e8',
                      borderRadius: '12px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      textAlign: 'center',
                      border: '1px solid #4caf50',
                      minWidth: '80px',
                      fontWeight: '500',
                      color: '#2e7d32'
                    }}>
                      {renderCell(product, 'pallet')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>{renderCell(product, 'nbox')}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>{renderCell(product, 'nkoli')}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>{renderCell(product, 'nBundle')}</td>
                  <td style={{ textAlign: 'center' }}>
                  {editingId === product.id ? (
                    <>
                      <button className="action-btn" title="Kaydet" onClick={handleSave} disabled={savingId === product.id}>
                        {savingId === product.id ? (
                          <i className="fa-solid fa-spinner fa-spin" style={{ color: '#28a745' }}></i>
                        ) : (
                          <i className="fa-solid fa-check" style={{ color: '#28a745' }}></i>
                        )}
                      </button>
                      <button className="action-btn" title="İptal" onClick={handleCancel} disabled={savingId === product.id}>
                        <i className="fa-solid fa-times" style={{ color: '#dc3545' }}></i>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="action-btn" title="Düzenle" onClick={() => handleEdit(product)}>
                        <i className="fa-solid fa-pen-to-square" style={{ color: '#40454f' }}></i>
                      </button>
                      <button className="action-btn" title="Sil" onClick={() => openDeleteModal(product)}>
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
          Toplam {filteredProducts.length} ürün gösteriliyor
          {filteredProducts.length !== products.length && (
            <span> (toplam {products.length} üründen filtrelendi)</span>
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
              <h3>Ürünü Sil</h3>
            </div>
            <div className="modal-body">
              <p><b>{deleteTarget.urunAdi}</b> ürününü silmek istediğinize emin misiniz?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>İptal</button>
              <button className="btn-delete" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add New Product Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Yeni Ürün Ekle</h3>
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
                title="Excel'den toplu ürün ekle"
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
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {/* Basic Information */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '5px' }}>
                    Temel Bilgiler
                  </h4>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Ürün Adı *</label>
                  <input
                    type="text"
                    value={newProduct.urunAdi}
                    onChange={(e) => handleNewProductInputChange('urunAdi', e.target.value)}
                    className="form-input"
                    placeholder="Ürün adını girin"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">SAP Kodu</label>
                  <input
                    type="text"
                    value={newProduct.sapKodu}
                    onChange={(e) => handleNewProductInputChange('sapKodu', e.target.value)}
                    className="form-input"
                    placeholder="SAP kodunu girin"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Tip</label>
                  <SearchableDropdown
                    options={tipOptions}
                    value={newProduct.tip}
                    onChange={(value) => handleNewProductInputChange('tip', value)}
                    placeholder="Tip seçin veya yazın"
                    allowCustom
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Kolileme Yöntemi</label>
                  <select
                    value={newProduct.kolilemeYontemi}
                    onChange={(e) => handleNewProductInputChange('kolilemeYontemi', e.target.value)}
                    className="form-select"
                  >
                    <option value="makine">Makine Kolileme</option>
                    <option value="manuel">Manuel Kolileme</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Kutu</label>
                  <SearchableDropdown
                    options={kutuOptions}
                    value={newProduct.kutu}
                    onChange={(value) => handleNewProductInputChange('kutu', value)}
                    placeholder="Kutu seçin"
                  />
                </div>

                {/* Bundle Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2c3e50', borderBottom: '2px solid #e74c3c', paddingBottom: '5px' }}>
                    Bundle Bilgileri
                  </h4>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Bundle</label>
                  <select
                    value={newProduct.bundle}
                    onChange={(e) => handleNewProductInputChange('bundle', e.target.value)}
                    className="form-select"
                  >
                    <option value="YOK">YOK</option>
                    <option value="VAR">VAR</option>
                  </select>
                </div>

                {/* Carton Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2c3e50', borderBottom: '2px solid #f39c12', paddingBottom: '5px' }}>
                    Koli Bilgileri
                  </h4>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Koli</label>
                  <select
                    value={newProduct.koli}
                    onChange={(e) => handleNewProductInputChange('koli', e.target.value)}
                    className="form-select"
                  >
                    <option value="YOK">YOK</option>
                    <option value="VAR">VAR</option>
                  </select>
                </div>
                
                {newProduct.koli === 'VAR' && (
                  <div className="form-group">
                    <label className="form-label">KL</label>
                    <SearchableDropdown
                      options={klOptions}
                      value={newProduct.kl}
                      onChange={(value) => handleNewProductInputChange('kl', value)}
                      placeholder="KL seçin"
                    />
                  </div>
                )}

                {/* Pallet Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#2c3e50', borderBottom: '2px solid #27ae60', paddingBottom: '5px' }}>
                    Palet Bilgileri
                  </h4>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Pallet</label>
                  <SearchableDropdown
                    options={PALLET_OPTIONS}
                    value={newProduct.pallet}
                    onChange={(value) => handleNewProductInputChange('pallet', value)}
                    placeholder="Pallet seçin"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Palet içi kutu sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.nbox || ''}
                    onChange={(e) => handleNewProductInputChange('nbox', e.target.value ? Number(e.target.value) : null)}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Palet içi koli sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.nkoli || ''}
                    onChange={(e) => handleNewProductInputChange('nkoli', e.target.value ? Number(e.target.value) : null)}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Palet içi bundle sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.nBundle || ''}
                    onChange={(e) => handleNewProductInputChange('nBundle', e.target.value ? Number(e.target.value) : null)}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeAddModal}>İptal</button>
              <button type="button" className="btn-save" onClick={handleAddNewProduct}>Ekle</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default ProductTable 
