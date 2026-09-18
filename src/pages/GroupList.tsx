import React, { useState, useEffect } from 'react'
import api from '../services/api'

interface ProductGroup {
  boxKey: string;
  products: Array<{
    productKey: string;
    productName: string;
    isBundleRequired: boolean;
  }>;
}

const GroupList: React.FC = () => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductGroups();
  }, []);

  const fetchProductGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('products/all');
      const products = response.data;
      
      // Group products by BoxKey
      const groupsMap = new Map<string, ProductGroup>();
      
      products.forEach((product: any) => {
        const boxKey = product.boxKey;
        if (!groupsMap.has(boxKey)) {
          groupsMap.set(boxKey, {
            boxKey: boxKey,
            products: []
          });
        }
        
        groupsMap.get(boxKey)!.products.push({
          productKey: product.productKey,
          productName: product.productName || product.productKey,
          isBundleRequired: product.isBundleRequired
        });
      });
      
      // Convert to array and sort by boxKey
      const groups = Array.from(groupsMap.values()).sort((a, b) => a.boxKey.localeCompare(b.boxKey));
      setProductGroups(groups);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <h2>Grup Listesi</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <h2>Grup Listesi</h2>
        <div style={{ color: 'red', padding: '20px' }}>
          <p>Hata: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h2>Grup Listesi</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Aynı kutu boyutuna sahip ürünler gruplandırılmıştır.
      </p>
      
      {productGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Henüz ürün grubu bulunmamaktadır.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {productGroups.map((group, _index) => (
            <div 
              key={group.boxKey}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '2px solid #007bff'
              }}>
                <h3 style={{ margin: 0, color: '#007bff' }}>
                  Kutu Tipi: {group.boxKey}
                </h3>
                <span style={{ 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  {group.products.length} ürün
                </span>
              </div>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                {group.products.map((product) => (
                  <div 
                    key={product.productKey}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div>
                        <strong>{product.productName}</strong>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                          Ürün Kodu: {product.productKey}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          backgroundColor: product.isBundleRequired ? '#28a745' : '#6c757d',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          marginBottom: '4px'
                        }}>
                          {product.isBundleRequired ? 'Bundle Gerekli' : 'Bundle Yok'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GroupList 