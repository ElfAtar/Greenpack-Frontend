import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import BoxTable from '../components/BoxTable'
import type { Box } from '../components/BoxTable'
import { useToast } from '../components/ToastContainer'

// Map API BoxMaster to BoxTable type
function mapApiBoxToTable(b: any): Box {
  const asText = (input: unknown): string => String(input ?? '')
  return {
    id: asText(b?.boxKey),
    kutuKodu: asText(b?.boxKey),        // Kutu Kodu
    en: (b?.width ?? 0),   // En
    boy: (b?.thickness ?? 0), // Boy
    yukseklik: (b?.height ?? 0) // Yükseklik
  }
}

function mapTableBoxToApi(box: Box) {
  return {
    boxKey: box.kutuKodu,
    width: box.en,
    thickness: box.boy,        // Boy maps to thickness (d2)
    height: box.yukseklik      // Yükseklik maps to height (d3)
  }
}

const BoxList: React.FC = () => {
  const { showSuccess, showError, ToastContainer } = useToast()
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId] = useState<string | null>(null)
  const [saveError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    api.get('box/all')
      .then(res => {
        const data = res.data
        setBoxes(Array.isArray(data) ? data.map(mapApiBoxToTable) : [])
        setLoading(false)
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || err.message)
        setLoading(false)
      })
  }, [])

  const handleSave = (updatedBox: Box) => {
    const apiBox = mapTableBoxToApi(updatedBox);
    api.put(`box/update/${encodeURIComponent(updatedBox.kutuKodu)}`, apiBox)
      .then(() => {
        setBoxes(boxes.map(b => b.id === updatedBox.id ? updatedBox : b));
        showSuccess('Kutu başarıyla güncellendi!');
      })
      .catch((err: any) => {
        showError('Güncelleme başarısız: ' + (err.response?.data?.message || err.message));
      });
  }

  const handleDelete = (boxId: string) => {
    api.delete(`box/delete/${encodeURIComponent(boxId)}`)
      .then(() => {
        setBoxes(boxes.filter(b => b.id !== boxId));
        showSuccess('Kutu başarıyla silindi!');
      })
      .catch((err: any) => {
        showError('Silme işlemi başarısız: ' + (err.response?.data?.message || err.message));
      });
  }

  const handleAddNew = async (newBox: Box) => {
    const apiBox = mapTableBoxToApi(newBox);
    
    try {
      const response = await api.post('box/create', apiBox);
      const createdBox = response.data;
      const mappedBox = mapApiBoxToTable(createdBox);
      setBoxes([...boxes, mappedBox]);
      showSuccess('Yeni kutu başarıyla eklendi!');
    } catch (err: any) {
      showError('Kutu ekleme başarısız: ' + (err.response?.data?.message || err.message));
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    api.post('box/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(res => {
        const data = res.data
        setImportMessage(data.Message || 'Import successful!');
        showSuccess(data.Message || 'Excel dosyası başarıyla içe aktarıldı!');
        // Refresh boxes
        return api.get('box/all');
      })
      .then(res => {
        const data = res.data
        setBoxes(Array.isArray(data) ? data.map(mapApiBoxToTable) : [])
      })
      .catch((err: any) => {
        setImportMessage('Import failed: ' + (err.response?.data?.Message || err.response?.data?.message || err.message));
        showError('İçe aktarma başarısız: ' + (err.response?.data?.Message || err.response?.data?.message || err.message));
      });
  }

  const handleDownloadClick = async () => {
    try {
      const response = await api.get('box/download-excel', {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'kutular.xlsx';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      }
      
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

  if (loading) return <div>Loading...</div>
  if (error) return <div style={{color:'red'}}>Error: {error}</div>

  return (
    <>
      <ToastContainer />
      <div className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {saveError && <div style={{color:'red', marginBottom: 8}}>Kaydetme hatası: {saveError}</div>}
      {importMessage && <div style={{color: importMessage.startsWith('Import failed') ? 'red' : 'green', marginBottom: 8}}>{importMessage}</div>}
      <input
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <BoxTable
        boxes={boxes}
        onSave={handleSave}
        onDelete={handleDelete}
        savingId={savingId}
        onAddNew={handleAddNew}
        onDownloadClick={handleDownloadClick}
      />
      </div>
    </>
  )
}

export default BoxList 
