import React from 'react';
import type { VisualizationDto } from '../types/visualization';

interface CombinationDetailsProps {
  data: VisualizationDto;
}

const CombinationDetails: React.FC<CombinationDetailsProps> = ({ data }) => {
  // Add safety check to ensure data is available
  if (!data || !data.carton) {
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '24px',
        marginTop: '24px',
        marginBottom: '24px',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        clear: 'both'
      }}>
        <div style={{ textAlign: 'center', color: '#6c757d' }}>
          Loading combination details...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '24px',
      marginTop: '40px',
      marginBottom: '24px',
      maxWidth: '100%',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1,
      clear: 'both'
    }}>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: '#495057',
        borderBottom: '2px solid #007bff',
        paddingBottom: '8px'
      }}>
        Senaryo Sonuç Detayları
      </h3>
      {/* Scenario Name */}
      <div style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '500',
        color: '#495057',
        letterSpacing: '0.5px',
        textAlign: 'left'
      }}>
        Senaryo Adı: <span style={{ color: '#dc2626', fontWeight: 600 }}>{data.scenarioName || '-'}</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '20px',
        minHeight: '400px'
      }}>
        {/* Box Details */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #e3f2fd'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>📦</span>
            Kutu Bilgileri
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Boyut:</span>
              <span style={{ fontWeight: '500' }}>{data.box.width} x {data.box.height} x {data.box.thickness} mm</span>
            </div>
            <span style={{ fontSize: '18px' }}></span>
            <span style={{ color: '#dc2626' }}>📚 Bundle Bilgileri</span> 
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Bundle:</span>
              <span style={{ fontWeight: '500', color: data.bundle.enabled ? '#16a34a' : '#dc2626' }}>
                {data.bundle.enabled ? 'Var' : 'Yok'}
              </span>
            </div>
            {data.bundle.enabled && (
              <>
            {data.bundle.count !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6c757d' }}>Kutu Sayısı:</span>
                <span style={{ fontWeight: '500' }}>{data.bundle.count}</span>
              </div>
            )}
                {data.bundle.numBoxX !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>X Ekseni:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.numBoxX}</span>
                  </div>
                )}
                {data.bundle.numBoxY !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Y Ekseni:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.numBoxY}</span>
                  </div>
                )}
                {data.bundle.numBoxZ !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Z Ekseni:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.numBoxZ}</span>
                  </div>
                )}
                {data.bundle.bundleWidth !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Bundle Genişlik:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.bundleWidth} mm</span>
                  </div>
                )}
                {data.bundle.bundleHeight !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Bundle Yükseklik:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.bundleHeight} mm</span>
                  </div>
                )}
                {data.bundle.bundleThickness !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Bundle Kalınlık:</span>
                    <span style={{ fontWeight: '500' }}>{data.bundle.bundleThickness} mm</span>
                  </div>
                )}
              </>
            )}
          </div>
            
          </div>
        </div>

        {/* Carton Details */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #fef2f2'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            Koli Bilgileri
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Koli Kodu:</span>
              <span style={{ fontWeight: '500' }}>{data.carton.cartonKey}</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>İç Genişlik:</span>
               <span style={{ fontWeight: '500' }}>{data.carton.width} mm</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>İç Yükseklik:</span>
               <span style={{ fontWeight: '500' }}>{data.carton.height} mm</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>İç Kalınlık:</span>
               <span style={{ fontWeight: '500' }}>{data.carton.thickness} mm</span>
             </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: '#6c757d' }}>Dış Genişlik:</span>
                 <span style={{ fontWeight: '500' }}>{data.carton.cartonWidth || 'N/A'} mm</span>
               </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>Dış Yükseklik:</span>
               <span style={{ fontWeight: '500' }}>{data.carton.cartonHeight || 'N/A'} mm</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>Dış Kalınlık:</span>
               <span style={{ fontWeight: '500' }}>{data.carton.cartonThickness || 'N/A'} mm</span>
             </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Kutu/Bundle Sayısı:</span>
              <span style={{ fontWeight: '500' }}>{data.carton.boxesOrBundlesPerCarton || 'N/A'}</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#6c757d' }}>Koli Verimliliği:</span>
               <span style={{ 
                 fontWeight: '500',
                 color: (data.carton.utilization || 0) >= 80 ? '#16a34a' : (data.carton.utilization || 0) >= 60 ? '#f59e0b' : '#dc2626'
               }}>
                 {(data.carton.utilization || 0).toFixed(1)}%
               </span>
             </div>
          </div>
        </div>

        {/* Pallet Details - Bottom Left */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #f0fdf4'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>🚛</span>
            Palet Bilgileri
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Boyut:</span>
              <span style={{ fontWeight: '500' }}>{data.pallet.length} x {data.pallet.width} x {data.pallet.stackHeight} mm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Palet İçi Toplam Koli:</span>
              <span style={{ fontWeight: '500' }}>{data.pallet.totalCartons}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6c757d' }}>Palet Verimliliği:</span>
              <span style={{ 
                fontWeight: '500',
                color: data.pallet.utilization >= 80 ? '#16a34a' : data.pallet.utilization >= 60 ? '#f59e0b' : '#dc2626'
              }}>
                {data.pallet.utilization.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Order & Cost Information - Bottom Right (combined) - Only show if order data exists */}
        {data.orderData && (
        <div style={{
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #0ea5e9'
        }}>
          {/* Order Information Section */}
          {data.orderData && (
            <>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>📦</span>
                Sipariş Bilgileri
              </h4>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Toplam Kutu Sayısı:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: '#f59e0b',
                    fontSize: '16px'
                  }}>
                    {data.orderData.totalBoxCount}
                  </span>
                </div>
                {data.orderData.orderItems && data.orderData.orderItems.length > 0 && (
                  <>
                    <div style={{ 
                      borderTop: '1px solid #e0e7ff',
                      paddingTop: '8px',
                      marginTop: '4px',
                      color: '#6c757d',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Sipariş Kalemleri:
                    </div>
                    {data.orderData.orderItems.map((item, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                        <span style={{ color: '#6c757d' }}>Kalem {index + 1}:</span>
                        <span style={{ fontWeight: '500' }}>
                          %{item.percentage} ({item.count} kutu)
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {/* Cost Information Section */}
          {data.cost && data.cost.totalCost > 0 && (
            <>
              <h4 style={{
                margin: data.orderData ? '16px 0 12px 0' : '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#0ea5e9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderTop: data.orderData ? '2px solid #e0e7ff' : 'none',
                paddingTop: data.orderData ? '16px' : '0'
              }}>
                <span style={{ fontSize: '18px' }}>💰</span>
                Maliyet Bilgileri
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Toplam Maliyet:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: '#0ea5e9',
                    fontSize: '16px'
                  }}>
                    ₺{(data.cost.totalCost || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Koli Maliyeti:</span>
                  <span style={{ fontWeight: '500' }}>₺{(data.cost.cartonCost || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Palet Maliyeti:</span>
                  <span style={{ fontWeight: '500' }}>₺{(data.cost.palletCost || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Elleçleme Maliyeti:</span>
                  <span style={{ fontWeight: '500' }}>₺{(data.cost.handlingCost || 0).toFixed(2)}</span>
                </div>
                {data.orderData && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Toplam Kutu Sayısı:</span>
                    <span style={{ fontWeight: '500' }}>{data.orderData.totalBoxCount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Toplam Koli Sayısı:</span>
                  <span style={{ fontWeight: '500' }}>{Math.round(data.cost.totalBoxCount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6c757d' }}>Toplam Palet Sayısı:</span>
                  <span style={{ fontWeight: '500' }}>{Math.round(data.cost.totalPalletCount || 0)}</span>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CombinationDetails;
