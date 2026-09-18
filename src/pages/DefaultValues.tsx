import React, { useState, useEffect, useMemo } from 'react';
import type { DefaultValues, AF60ConstraintValues } from '../types';
import { ScenarioService } from '../services/scenarioService';

const DefaultValuesPage: React.FC = () => {
  const [defaultValues, setDefaultValues] = useState<DefaultValues | null>(null);
  const [originalValues, setOriginalValues] = useState<DefaultValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImagePopup, setShowImagePopup] = useState(false);

  useEffect(() => {
    fetchDefaultValues();
  }, []);

  const initializeAF60Constraints = (): AF60ConstraintValues => {
    return {
      // Feeding constraints (A, B, C)
      feedingA_Min: 20,
      feedingA_Max: 360,
      feedingB_Min: 12,
      feedingB_Max: 90,
      feedingC_Min: 60,
      feedingC_Max: 260,
      
      // Machine constraints (D, E, F, H, L)
      machineD_Min: 60,
      machineD_Max: 360,
      machineE_Min: 30,
      machineE_Max: 150,
      machineF_Min: 60,
      machineF_Max: 260,
      machineH_Min: 100,
      machineH_Max: 450,
      machineL_Min: 190,
      machineL_Max: 985
    };
  };

  const fetchDefaultValues = async () => {
    try {
      setLoading(true);
      const values = await ScenarioService.getDefaultValues();
      
      // Ensure AF60 constraints are initialized
      if (!values.af60Constraints) {
        values.af60Constraints = initializeAF60Constraints();
      }
      
      setDefaultValues(values);
      setOriginalValues({ ...values });
    } catch (err) {
      setError('Varsayılan değerler yüklenirken hata oluştu');
      console.error('Error fetching default values:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DefaultValues, value: string) => {
    if (!defaultValues) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setDefaultValues({
      ...defaultValues,
      [field]: numValue
    });
  };

  const handleAF60InputChange = (field: keyof AF60ConstraintValues, value: string) => {
    if (!defaultValues || !defaultValues.af60Constraints) return;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setDefaultValues({
      ...defaultValues,
      af60Constraints: {
        ...defaultValues.af60Constraints,
        [field]: numValue
      }
    });
  };

  const handleSave = async () => {
    if (!defaultValues) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await ScenarioService.updateDefaultValues(defaultValues);
      setSuccess('Varsayılan değerler başarıyla güncellendi');
      setOriginalValues(defaultValues); // Update original values after successful save
    } catch (err) {
      setError('Varsayılan değerler güncellenirken hata oluştu');
      console.error('Error updating default values:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalValues) {
      setDefaultValues({ ...originalValues });
    }
  };

  const hasChanges = useMemo(() => {
    if (!defaultValues || !originalValues) return false;
    return JSON.stringify(defaultValues) !== JSON.stringify(originalValues);
  }, [defaultValues, originalValues]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px',
        color: '#666'
      }}>
        <div>Varsayılan değerler yükleniyor...</div>
      </div>
    );
  }

  if (!defaultValues) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        fontSize: '18px',
        color: '#d32f2f'
      }}>
        <div>Varsayılan değerler yüklenemedi</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#1976d2',
          marginBottom: '8px',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal'
        }}>
          Varsayılan Değerler
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#666',
          margin: 0
        }}>
          Sistem genelinde kullanılan varsayılan parametreleri düzenleyin
        </p>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px',
          color: '#d32f2f',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '16px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px',
          color: '#2e7d32',
          marginBottom: '24px'
        }}>
          {success}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Left White Area - Basic Default Values */}
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#1976d2',
            marginBottom: '20px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e3f2fd',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal'
          }}>
            📋 Varsayılan Değerler
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Bundle Parameters */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                📦 Bundle Parametreleri
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Bundledaki Maksimum Kutu Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultValues.maxNumBoxesInABundle}
                    onChange={(e) => handleInputChange('maxNumBoxesInABundle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Bundle Boyutlarındaki Maksimum Kutu Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultValues.maxNumBoxesInAnyBundleDimension}
                    onChange={(e) => handleInputChange('maxNumBoxesInAnyBundleDimension', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Koli İçerisindeki Maksimum Kutu İstifi
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultValues.maxNumBoxesStackedInCarton}
                    onChange={(e) => handleInputChange('maxNumBoxesStackedInCarton', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pallet Parameters */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                🏗️ Palet Parametreleri
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Palet Maksimum Overhang (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.paletMaxOverhang}
                    onChange={(e) => handleInputChange('paletMaxOverhang', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Palet Maksimum Underhang (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.paletMaxUnderhang}
                    onChange={(e) => handleInputChange('paletMaxUnderhang', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cost Parameters */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                💰 Maliyet Parametreleri
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Birim Palet Maliyeti (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultValues.unitPalletCost}
                    onChange={(e) => handleInputChange('unitPalletCost', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Elleçleme Maliyeti (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultValues.handlingCost}
                    onChange={(e) => handleInputChange('handlingCost', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Koli Maliyeti (₺)
                  </label>
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '4px',
                    marginBottom: 0,
                    fontStyle: 'italic'
                  }}>
                    Koli maliyeti koli çeşidine göre değişiklik gösterir. Maliyetlere{' '}
                    <a 
                      href="/cartons" 
                      style={{ 
                        color: '#1976d2', 
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                    >
                      KOLİLER
                    </a>
                    {' '} 📦 sayfasından ulaşabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Gap Parameters */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                📦 Koli Boşluk Parametreleri
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Hand Gap Parameters */}
                <div>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#1976d2',
                    marginBottom: '12px'
                  }}>
                    🤲 El Kolileme
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Genişlik (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.handGapWidth}
                        onChange={(e) => handleInputChange('handGapWidth', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Kalınlık (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.handGapThickness}
                        onChange={(e) => handleInputChange('handGapThickness', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Yükseklik (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.handGapHeight}
                        onChange={(e) => handleInputChange('handGapHeight', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Machine Gap Parameters */}
                <div>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#1976d2',
                    marginBottom: '12px'
                  }}>
                    🏭 Makine Kolileme
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Genişlik (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.machineGapWidth}
                        onChange={(e) => handleInputChange('machineGapWidth', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Kalınlık (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.machineGapThickness}
                        onChange={(e) => handleInputChange('machineGapThickness', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px'
                      }}>
                        Yükseklik (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={defaultValues.machineGapHeight}
                        onChange={(e) => handleInputChange('machineGapHeight', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Right White Area - AF60 Constraint Values */}
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e3f2fd'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1976d2',
              margin: 0
            }}>
              🔧 AF60 Kısıt Değerleri
            </h2>
            <button
              onClick={() => setShowImagePopup(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
            >
              📖 Kılavuz
            </button>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Feeding Constraints */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                ⚡ Besleme Kısıtları
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding A Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingA_Min}
                    onChange={(e) => handleAF60InputChange('feedingA_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding A Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingA_Max}
                    onChange={(e) => handleAF60InputChange('feedingA_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding B Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingB_Min}
                    onChange={(e) => handleAF60InputChange('feedingB_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding B Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingB_Max}
                    onChange={(e) => handleAF60InputChange('feedingB_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding C Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingC_Min}
                    onChange={(e) => handleAF60InputChange('feedingC_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Feeding C Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.feedingC_Max}
                    onChange={(e) => handleAF60InputChange('feedingC_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Machine Constraints */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '16px',
                paddingBottom: '6px',
                borderBottom: '1px solid #e3f2fd'
              }}>
                🏭 Makine Kısıtları
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine D Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineD_Min}
                    onChange={(e) => handleAF60InputChange('machineD_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine D Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineD_Max}
                    onChange={(e) => handleAF60InputChange('machineD_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine E Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineE_Min}
                    onChange={(e) => handleAF60InputChange('machineE_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine E Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineE_Max}
                    onChange={(e) => handleAF60InputChange('machineE_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine F Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineF_Min}
                    onChange={(e) => handleAF60InputChange('machineF_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine F Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineF_Max}
                    onChange={(e) => handleAF60InputChange('machineF_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine H Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineH_Min}
                    onChange={(e) => handleAF60InputChange('machineH_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine H Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineH_Max}
                    onChange={(e) => handleAF60InputChange('machineH_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine L Min (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineL_Min}
                    onChange={(e) => handleAF60InputChange('machineL_Min', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Machine L Max (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultValues.af60Constraints.machineL_Max}
                    onChange={(e) => handleAF60InputChange('machineL_Max', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons - Positioned at bottom right */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '16px', 
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '1px solid #e0e0e0'
          }}>
            <button
              onClick={handleReset}
              disabled={saving || !hasChanges}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                opacity: (saving || !hasChanges) ? 0.6 : 1,
                minWidth: '120px'
              }}
            >
              Sıfırla
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              style={{
                padding: '12px 24px',
                backgroundColor: hasChanges ? '#1976d2' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                minWidth: '120px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Popup Modal */}
      {showImagePopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowImagePopup(false)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImagePopup(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '5px',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              AF60 Kısıt Değerleri Kılavuzu
            </h3>
            <img
              src="/Af60.png"
              alt="AF60 Constraint Values Reference"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                }
              }}
            />
            <div style={{
              display: 'none',
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              fontSize: '16px'
            }}>
              <p>Image not found. Please make sure the image is placed at:</p>
              <code style={{
                backgroundColor: '#f5f5f5',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                margin: '10px 0'
              }}>
                frontend/public/Af60.png
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefaultValuesPage;
