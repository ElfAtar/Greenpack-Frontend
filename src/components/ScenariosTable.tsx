import React, { useState, useMemo } from 'react'

export interface Scenario {
  id: string
  name: string
  filename: string
  products: string[]
  runMode: string
  productDisplay: string
  notes: string
  runDate: string
  runDateTime?: Date // Add optional runDateTime for sorting
  results: {
    combinations: any[]
    summary: any
    totalCombinations: number
    headers: string[]
  }
  creatorUser: string
  lastModifierUser: string
  status: boolean
}

interface ScenariosTableProps {
  scenarios: Scenario[]
  onDelete: (scenario: Scenario) => void
  onViewResults: (scenario: Scenario) => void
}

const ScenariosTable: React.FC<ScenariosTableProps> = ({ scenarios, onDelete, onViewResults }) => {
  const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase()
  const [nameFilter, setNameFilter] = useState('')

  // Filter scenarios based on name only and sort by newest first
  const filteredScenarios = useMemo(() => {
    return scenarios
      .filter(scenario => {
        const nameMatch = normalizeText(scenario.name).includes(normalizeText(nameFilter))
        return nameMatch
      })
      .sort((a, b) => {
        // Sort by runDateTime in descending order (newest first)
        const dateA = a.runDateTime || new Date(0) // Fallback to epoch if no date
        const dateB = b.runDateTime || new Date(0) // Fallback to epoch if no date
        return dateB.getTime() - dateA.getTime()
      })
  }, [scenarios, nameFilter])

  const clearFilters = () => {
    setNameFilter('')
  }

  return (
    <div className="users-table-wrapper">
      <div className="users-table-header">
        <h2>Senaryolar</h2>
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
          display: 'flex', 
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
              Senaryo Adı
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
                placeholder="Senaryo adına göre filtrele..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNameFilter('')
                  }
                }}
                style={{
                  width: '300px',
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
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {nameFilter && (
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
              backgroundColor: filteredScenarios.length !== scenarios.length ? '#fff3cd' : '#e7f3ff',
              border: filteredScenarios.length !== scenarios.length ? '1px solid #ffeaa7' : '1px solid #b3d9ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: filteredScenarios.length !== scenarios.length ? '#856404' : '#1565c0',
              whiteSpace: 'nowrap',
              fontWeight: '500'
            }}>
              {filteredScenarios.length} / {scenarios.length} senaryo
              {nameFilter && (
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
                Senaryo Adı
                {nameFilter && (
                  <i className="fa-solid fa-filter" style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }} title={`Filtre: ${nameFilter}`}></i>
                )}
              </th>
              <th style={{ minWidth: '200px', textAlign: 'center' }}>
                Ürün
              </th>
              <th style={{ textAlign: 'center' }}>Çalıştırma Modu</th>
              <th style={{ textAlign: 'center' }}>Oluşturan Kullanıcı</th>
              {/* <th>LastModifierUserName</th> */}
              <th style={{ textAlign: 'center' }}>Çalıştırma Tarihi</th>
              <th style={{ textAlign: 'center' }}>Notlar</th>
              <th style={{ textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredScenarios.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6c757d',
                  fontStyle: 'italic'
                }}>
                  {scenarios.length === 0 
                    ? 'Henüz senaryo bulunmuyor.' 
                    : 'Filtre kriterlerine uygun senaryo bulunamadı.'
                  }
                  {nameFilter && (
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
              filteredScenarios.map(scenario => (
                <tr key={scenario.id}>
                  <td>{scenario.name}</td>
                  <td style={{ minWidth: '200px', textAlign: 'center' }}>
                    <span 
                      style={{
                        backgroundColor: '#e3f2fd',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-block',
                        textAlign: 'center',
                        border: '1px solid #1976d2',
                        minWidth: '120px',
                        fontWeight: '500',
                        color: '#1976d2'
                      }}
                    >
                      {scenario.productDisplay}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <span 
                        style={{
                          backgroundColor: '#f3e5f5',
                          borderRadius: '12px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'inline-block',
                          textAlign: 'center',
                          border: '1px solid #9c27b0',
                          minWidth: '100px',
                          fontWeight: '500',
                          color: '#9c27b0'
                        }}
                      >
                        {scenario.runMode}
                      </span>
                      <span 
                        style={{
                          backgroundColor: '#e8f5e8',
                          borderRadius: '8px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          display: 'inline-block',
                          textAlign: 'center',
                          border: '1px solid #4caf50',
                          fontWeight: '500',
                          color: '#2e7d32'
                        }}
                      >
                        {scenario.results?.totalCombinations || 0} Kombinasyon
                      </span>
                    </div>
                  </td>
                  <td>
                    <span 
                      style={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-block',
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        minWidth: '100px'
                      }}
                    >
                      {scenario.creatorUser}
                    </span>
                  </td>
                  {/* <td>
                    {scenario.lastModifierUser ? (
                      <span 
                        style={{
                          backgroundColor: '#f5f5f5',
                          borderRadius: '12px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'inline-block',
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          minWidth: '100px'
                        }}
                      >
                        {scenario.lastModifierUser}
                      </span>
                    ) : null}
                  </td> */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <div 
                        style={{
                          backgroundColor: '#e8f5e8',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          display: 'inline-block',
                          textAlign: 'center',
                          border: '1px solid #4caf50',
                          minWidth: '80px',
                          color: '#2e7d32',
                          fontWeight: '500'
                        }}
                      >
                        {scenario.runDate ? scenario.runDate.split('\n')[0] : '-'}
                      </div>
                      <div 
                        style={{
                          backgroundColor: '#f1f8e9',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          display: 'inline-block',
                          textAlign: 'center',
                          border: '1px solid #81c784',
                          minWidth: '80px',
                          color: '#2e7d32',
                          fontWeight: '500'
                        }}
                      >
                        {scenario.runDate && scenario.runDate.includes('\n') ? scenario.runDate.split('\n')[1] : '-'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span 
                      style={{
                        backgroundColor: '#fff3e0',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-block',
                        textAlign: 'center',
                        border: '1px solid #ff9800',
                        minWidth: '100px',
                        color: '#e65100',
                        fontWeight: '500',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={scenario.notes || 'No notes'}
                    >
                      {scenario.notes || '-'}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" title="Sonuçları Görüntüle" onClick={() => onViewResults(scenario)}>
                      <i className="fa-solid fa-chart-bar" style={{ color: '#40454f' }}></i>
                    </button>
                    <button className="action-btn" title="Sil" onClick={() => onDelete(scenario)}>
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
        <div style={{ fontSize: '14px', color: '#6c757d', paddingLeft: '5px' }}>
          Toplam {filteredScenarios.length} senaryo gösteriliyor
          {filteredScenarios.length !== scenarios.length && (
            <span> (toplam {scenarios.length} senaryodan filtrelendi)</span>
          )}
        </div>
        <div>
          <button className="pagination-btn" disabled>{'<'}</button>
          <span className="pagination-page">1</span>
          <button className="pagination-btn" disabled>{'>'}</button>
        </div>
      </div>
    </div>
  )
}

export default ScenariosTable 
