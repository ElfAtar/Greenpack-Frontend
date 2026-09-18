import React, { useState, useEffect, useRef } from 'react';
import CartonTable, { type Carton } from '../components/CartonTable';
import api from '../services/api'
import { useToast } from '../components/ToastContainer';

// Map API CartonMaster to CartonTable type
function mapApiCartonToTable(c: any): Carton {
  const asText = (input: unknown): string => String(input ?? '');
  return {
    id: asText(c?.cartonKey),
    koliKodu: asText(c?.cartonKey),
    en: (c?.width ?? 0),              // Width (outer) - keep mm values
    boy: (c?.thickness ?? 0),         // Boy/depth stays on the bottom footprint
    yukseklik: (c?.height ?? 0),      // Height is always vertical
    koliEn: ((c?.carton_width ?? c?.carton_Width) ?? 0),   // Carton_width (inner) - keep mm values
    koliBoy: ((c?.carton_thickness ?? c?.carton_Thickness) ?? 0), // Boy/depth thickness
    koliKalinlik: ((c?.carton_height ?? c?.carton_Height) ?? 0), // Height thickness
    agirlik: c?.weight ?? 0,               // Weight
    koliMaliyet: c?.cartonCost ?? 0,       // CartonCost
    kgCo2: c?.kgCo2 ?? 0,                 // CO2 emissions
  };
}

function mapTableCartonToApi(carton: Carton) {
  return {
    cartonKey: carton.koliKodu,
    width: carton.en,                           // Keep mm values
    thickness: carton.boy,                      // Boy/depth stays on the bottom footprint
    height: carton.yukseklik,                   // Height is always vertical
    carton_width: carton.koliEn,                // Keep mm values
    carton_thickness: carton.koliBoy,           // Boy/depth thickness
    carton_height: carton.koliKalinlik,         // Height thickness
    weight: carton.agirlik,
    cartonCost: carton.koliMaliyet,
    kgCo2: carton.kgCo2,
  };
}

const CartonList: React.FC = () => {
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError, ToastContainer } = useToast();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api.get('carton/all')
      .then(res => {
        const data = res.data
        setCartons(Array.isArray(data) ? data.map(mapApiCartonToTable) : []);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      });
  }, []);

  const handleRefresh = () => {
    api.get('carton/all')
      .then(res => {
        const data = res.data
        setCartons(Array.isArray(data) ? data.map(mapApiCartonToTable) : [])
      })
      .catch((err: any) => {
        showError('Koliler yüklenirken hata oluştu: ' + (err.response?.data?.message || err.message))
      })
  }

  const handleSave = (updatedCarton: Carton) => {
    const apiCarton = mapTableCartonToApi(updatedCarton);
    api.put(`carton/update/${encodeURIComponent(updatedCarton.koliKodu)}`, apiCarton)
      .then(() => {
        setCartons(cartons.map(c => c.id === updatedCarton.id ? updatedCarton : c));
        showSuccess('Koli başarıyla güncellendi!');
      })
      .catch((err: any) => {
        showError('Güncelleme başarısız: ' + (err.response?.data?.message || err.message));
      });
  };

  const handleDelete = (cartonId: string) => {
    api.delete(`carton/delete/${encodeURIComponent(cartonId)}`)
      .then(() => {
        setCartons(cartons.filter(c => c.id !== cartonId));
        showSuccess('Koli başarıyla silindi!');
      })
      .catch((err: any) => {
        showError('Silme işlemi başarısız: ' + (err.response?.data?.message || err.message));
      });
  };

  const handleAddNew = async (newCarton: Carton) => {
    const apiCarton = mapTableCartonToApi(newCarton);
    
    try {
      const response = await api.post('carton/create', apiCarton);
      const createdCarton = response.data;
      const mappedCarton = mapApiCartonToTable(createdCarton);
      setCartons([...cartons, mappedCarton]);
      showSuccess('Yeni koli başarıyla eklendi!');
    } catch (err: any) {
      showError('Koli ekleme başarısız: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    api.post('carton/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(res => {
        const data = res.data
        setImportMessage(data.Message || 'Import successful!');
        // Refresh cartons
        return api.get('carton/all');
      })
      .then(res => {
        const data = res.data
        setCartons(Array.isArray(data) ? data.map(mapApiCartonToTable) : []);
      })
      .catch((err: any) => {
        setImportMessage('Import failed: ' + (err.response?.data?.Message || err.response?.data?.message || err.message));
      });
  };

  const handleDownloadClick = async () => {
    try {
      const response = await api.get('carton/download-excel', {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'koliler.xlsx';
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
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {importMessage && <div style={{ color: importMessage.startsWith('Import failed') ? 'red' : 'green', marginBottom: 8 }}>{importMessage}</div>}
      <ToastContainer />
      <input
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <CartonTable
        cartons={cartons}
        onSave={handleSave}
        onDelete={handleDelete}
        savingId={null}
        onAddNew={handleAddNew}
        onDownloadClick={handleDownloadClick}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default CartonList; 
