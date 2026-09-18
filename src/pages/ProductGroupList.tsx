import React, { useState, useEffect } from 'react'
import ProductGroupTable, { type ProductGroup, type ApiProductGroup } from '../components/ProductGroupTable'
import api from '../services/api'
import { useToast } from '../components/ToastContainer';
import { useAuth } from '../context/AuthContext';

// Map API ProductGroup to ProductGroupTable type
function mapApiProductGroupToTable(p: ApiProductGroup): ProductGroup {
  const asText = (input: unknown): string => String(input ?? '')
  const productKeys = Array.isArray(p?.productKeys) ? p.productKeys : []
  return {
    id: asText(p?.id),
    groupName: asText(p?.groupName),
    products: productKeys
      .map((key: string) => asText(key))
      .filter((key: string) => key.trim() !== '')
      .map((key: string) => ({
      productKey: key,
      productName: key, // We'll need to fetch product names separately
      boxKey: '',
      type: ''
    })),
    user: asText(p?.user)
  }
}

function mapTableProductGroupToApi(productGroup: ProductGroup) {
  return {
    id: productGroup.id,
    groupName: productGroup.groupName,
    productKeys: productGroup.products?.map(p => p.productKey) || [],
    user: productGroup.user
  }
}

const ProductGroupList: React.FC = () => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError, ToastContainer } = useToast();
  const { user } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const currentUserName = user?.displayName || user?.username || user?.email || ''

  useEffect(() => {
    // First, update the Excel file with proper IDs for existing groups
    api.post('productgroups/update-ids')
      .catch(err => {
        console.warn('Error updating Excel with IDs:', err)
      })
      .finally(() => {
        // Then fetch the product groups
        fetchProductGroups()
      })
  }, [])

  const fetchProductGroups = async () => {
    try {
      setLoading(true)
      const response = await api.get('productgroups/all')
      const data = response.data
      setProductGroups(Array.isArray(data) ? data.map(mapApiProductGroupToTable) : [])
    } catch (err: any) {
      // If the endpoint doesn't exist, we'll start with empty data
      if (err.response?.status === 404) {
        setProductGroups([])
      } else {
        setError(err.response?.data?.message || err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedProductGroup: ProductGroup) => {
    const apiProductGroup = mapTableProductGroupToApi(updatedProductGroup)
    setSavingId(updatedProductGroup.id)
    
    api.put(`productgroups/update/${encodeURIComponent(updatedProductGroup.id)}`, apiProductGroup)
      .then(() => {
        // Refresh the product groups list to ensure we have the latest data
        fetchProductGroups()
        setSavingId(null)
      })
      .catch((err: any) => {
        setSaveError('Update failed: ' + (err.response?.data?.message || err.message))
        setSavingId(null)
      })
  }

  const handleDelete = (productGroupId: string) => {
    api.delete(`productgroups/delete/${encodeURIComponent(productGroupId)}`)
      .then(() => {
        // Refresh the product groups list to ensure we have the latest data
        fetchProductGroups()
        showSuccess('Ürün grubu başarıyla silindi!')
      })
      .catch((err: any) => {
        showError('Silme işlemi başarısız: ' + (err.response?.data?.message || err.message))
      })
  }

  const handleAddNew = (newProductGroup: ProductGroup) => {
    const apiProductGroup = mapTableProductGroupToApi({
      ...newProductGroup,
      user: currentUserName
    })
    console.log('Sending data:', apiProductGroup)
    
    api.post('productgroups/create', apiProductGroup)
      .then(() => {
        // Refresh the product groups list to ensure we have the latest data
        fetchProductGroups()
        showSuccess('Yeni ürün grubu başarıyla eklendi!')
      })
      .catch((err: any) => {
        showError('Ürün grubu ekleme başarısız: ' + (err.response?.data?.message || err.message))
      })
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div style={{color:'red'}}>Error: {error}</div>

  return (
    <div className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {saveError && <div style={{color:'red', marginBottom: 8}}>Kaydetme hatası: {saveError}</div>}
      <ToastContainer />
      <ProductGroupTable
        productGroups={productGroups}
        onSave={handleSave}
        onDelete={handleDelete}
        savingId={savingId}
        onAddNew={handleAddNew}
      />
    </div>
  )
}

export default ProductGroupList 
