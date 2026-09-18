import React, { useState, useEffect, useRef } from 'react'
import ProductTable from '../components/ProductTable'
import type { Product } from '../components/ProductTable'
import api from '../services/api'
import { useToast } from '../components/ToastContainer'

// Map API ProductMaster to ProductTable type
function mapApiProductToTable(p: any): Product {
  const asText = (input: unknown): string => String(input ?? '')
  return {
    id: asText(p?.productKey),
    urunAdi: asText(p?.productName),         // Ürün Adı
    sapKodu: asText(p?.sapCode),             // SAP kodu
    tip: asText(p?.type),                    // Tip
    kolilemeYontemi: asText(p?.cartoningMethod) || 'makine', // Kolileme Yöntemi
    kutu: asText(p?.boxKey),                 // Kutu
    bundle: p.isBundleRequired ? 'VAR' : 'YOK', // Bundle?
    koli: p.isCartonRequired ? 'VAR' : 'YOK',   // Koli
    kl: asText(p?.cartonKey),                // KL
    pallet: asText(p?.paletType),            // Pallet
    nbox: p?.nBoxPallet ?? null,     // nbox
    nkoli: p?.nCartonPallet ?? null, // nKoli
    nBundle: p?.nBundlePallet ?? null// nBundle
  }
}

function mapTableProductToApi(product: Product) {
  // Generate product key from product name if id is empty (for new products)
  const productKey = product.id || product.urunAdi;
  
  return {
    productKey: productKey,
    productName: product.urunAdi,
    sapCode: product.sapKodu,
    type: product.tip,
    cartoningMethod: product.kolilemeYontemi,
    boxKey: product.kutu,
    isBundleRequired: product.bundle === 'VAR',
    isCartonRequired: product.koli === 'VAR',
    cartonKey: product.kl,
    paletType: product.pallet,
    nBoxPallet: product.nbox,
    nCartonPallet: product.nkoli,
    nBundlePallet: product.nBundle,
    explanation: ''
  }
}

const ProductList: React.FC = () => {
  const { showSuccess, showError, ToastContainer } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId] = useState<string | null>(null)
  const [saveError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    api.get('products/all')
      .then(res => {
        const data = res.data
        setProducts(Array.isArray(data) ? data.map(mapApiProductToTable) : [])
        setLoading(false)
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || err.message || 'Failed to fetch products')
        setLoading(false)
      })
  }, [])

  const handleSave = (updatedProduct: Product) => {
    const apiProduct = mapTableProductToApi(updatedProduct);
    api.put('products/update', apiProduct)
      .then(() => {
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        showSuccess('Ürün başarıyla güncellendi!');
      })
      .catch((err: any) => {
        showError('Güncelleme başarısız: ' + (err.response?.data?.message || err.message));
      });
  }

  const handleDelete = (productId: string) => {
    console.log('[ProductList] Attempting to delete product with ID:', productId);
    api.delete('products/delete', { params: { key: productId } })
      .then(res => {
        console.log('[ProductList] Delete response status:', res.status);
        console.log('[ProductList] Delete successful, removing from frontend state');
        setProducts(products.filter(p => p.id !== productId));
        showSuccess('Ürün başarıyla silindi!');
      })
      .catch((err: any) => {
        console.error('[ProductList] Delete error:', err);
        showError('Silme işlemi başarısız: ' + (err.response?.data?.message || err.message));
      });
  }

  const handleAddNew = (newProduct: Product) => {
    const apiProduct = mapTableProductToApi(newProduct);
    api.post('products/create', apiProduct)
      .then(res => {
        const createdProduct = res.data;
        const mappedProduct = mapApiProductToTable(createdProduct);
        setProducts([...products, mappedProduct]);
        showSuccess('Yeni ürün başarıyla eklendi!');
      })
      .catch((err: any) => {
        showError('Ürün ekleme başarısız: ' + (err.response?.data?.message || err.message));
      });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    api.post('products/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(res => {
        const data = res.data;
        // Show message from backend (already in Turkish)
        const message = data.Message || 'Ürün başarıyla eklendi!';
        setImportMessage(message);
        showSuccess(message);
        // Refresh products
        return api.get('products/all');
      })
      .then(res => {
        const data = res.data;
        setProducts(Array.isArray(data) ? data.map(mapApiProductToTable) : [])
      })
      .catch((err: any) => {
        const errorMsg = 'İçe aktarma başarısız: ' + (err.response?.data?.Message || err.response?.data?.message || err.message);
        setImportMessage(errorMsg);
        showError(errorMsg);
      });
  }

  const handleDownloadClick = async () => {
    try {
      const response = await api.get('products/download-excel', {
        responseType: 'blob'
      });
      
      // Get the blob from response
      const blob = response.data;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'urunler.xlsx';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Excel dosyası başarıyla indirildi');
    } catch (error: any) {
      showError('Excel dosyası indirilirken hata oluştu: ' + (error.response?.data?.Message || error.message));
    }
  }

  const handleRefresh = () => {
    api.get('products/all')
      .then(res => {
        const data = res.data
        setProducts(Array.isArray(data) ? data.map(mapApiProductToTable) : [])
      })
      .catch((err: any) => {
        showError('Ürünler yüklenirken hata oluştu: ' + (err.response?.data?.message || err.message))
      })
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div style={{color:'red'}}>Error: {error}</div>

  return (
    <>
      <ToastContainer />
      <div className="main-content" style={{ padding: '20px' }}>
        {saveError && <div style={{color:'red', marginBottom: 8}}>Kaydetme hatası: {saveError}</div>}
        {importMessage && <div style={{color: importMessage.startsWith('Import failed') ? 'red' : 'green', marginBottom: 8}}>{importMessage}</div>}
        <input
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <ProductTable
          products={products}
          onSave={handleSave}
          onDelete={handleDelete}
          savingId={savingId}
          onAddNew={handleAddNew}
          onDownloadClick={handleDownloadClick}
          onRefresh={handleRefresh}
        />
      </div>
    </>
  )
}

export default ProductList 
