import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { VisualizationDto } from './types/visualization';
import api from './services/api';

interface VisualizationWrapperProps {
  onDataLoaded?: (data: VisualizationDto) => void;
}

export default function VisualizationWrapper({ onDataLoaded }: VisualizationWrapperProps = {}) {
  const location = useLocation();
  const [data, setData] = useState<VisualizationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisualizationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get parameters from URL query parameters
        const urlParams = new URLSearchParams(location.search);
        const productId = urlParams.get('productId');
        const optionNumber = urlParams.get('optionNumber');
        const fileName = urlParams.get('fileName');
        const scenarioId = urlParams.get('scenarioId');
        const combinationKey = urlParams.get('key') || urlParams.get('combination');
        
        console.log('🔍 VisualizationWrapper - URL search:', location.search);
        console.log('🔍 VisualizationWrapper - productId:', productId);
        console.log('🔍 VisualizationWrapper - optionNumber:', optionNumber);
        console.log('🔍 VisualizationWrapper - fileName:', fileName);
        console.log('🔍 VisualizationWrapper - scenarioId:', scenarioId);
        console.log('🔍 VisualizationWrapper - combinationKey from URL:', combinationKey);
        
        let response: any;
        
        if (productId && optionNumber) {
          // Use the new endpoint with productId and optionNumber
          console.log('🔍 Raw optionNumber from URL:', optionNumber);
          console.log('🔍 optionNumber type:', typeof optionNumber);
          console.log('🔍 optionNumber length:', optionNumber.length);
          
          // Extract number from strings like "1", "Option 1", "Kombinasyon 1", etc.
          const numberMatch = optionNumber.match(/\d+/);
          if (!numberMatch) {
            throw new Error(`Invalid option number: ${optionNumber}. No numeric value found.`);
          }
          
          const optionNum = parseInt(numberMatch[0], 10);
          console.log('🔍 Extracted number from optionNumber:', optionNum);
          console.log('🔍 Parsed optionNum:', optionNum);
          console.log('🔍 isNaN(optionNum):', isNaN(optionNum));
          
          if (isNaN(optionNum) || optionNum < 1) {
            throw new Error(`Invalid option number: ${optionNumber}. Must be a positive integer.`);
          }
          
          let endpoint = `combinations/visualization-by-option?productId=${encodeURIComponent(productId)}&optionNumber=${optionNum}`;
          if (fileName) {
            endpoint += `&fileName=${encodeURIComponent(fileName)}`;
          }
          if (scenarioId) {
            endpoint += `&scenarioId=${encodeURIComponent(scenarioId)}`;
          }
          console.log('🔍 Final endpoint being called:', endpoint);
          response = await api.get(endpoint);
        } else if (combinationKey) {
          // Use the legacy endpoint with combination key
          const key = decodeURIComponent(combinationKey);
          console.log('Using legacy endpoint with combination key:', key);
          const encodedKey = encodeURIComponent(key);
          response = await api.get(`combinations/visualization/${encodedKey}`);
        } else {
          // Try to get available JSON files first
          try {
            const jsonFilesResponse = await api.get('combinations/available-json-files');
            const jsonData = jsonFilesResponse.data;
            const jsonFiles = jsonData.Files || [];
            
            if (jsonFiles.length > 0) {
              // Use the first JSON file with a default productId and optionNumber
              const endpoint = `combinations/visualization-by-option?productId=default&optionNumber=1&fileName=${encodeURIComponent(jsonFiles[0])}`;
              console.log('Using first available JSON file with default params:', endpoint);
              response = await api.get(endpoint);
            } else {
              throw new Error('No JSON files available');
            }
          } catch (jsonError) {
            console.log('JSON files not available, trying combinations:', jsonError);
            
            // Fallback to getting available combinations
            const combinationsResponse = await api.get('combinations');
            const availableKeysData = combinationsResponse.data;
            console.log('Available combination keys data:', availableKeysData);
            
            const availableKeys = availableKeysData.Keys || availableKeysData;
            
            if (!availableKeys || availableKeys.length === 0) {
              throw new Error(availableKeysData.Message || 'No combinations available. Please run a calculation first.');
            }
            
            // Use the first available key with legacy endpoint
            const key = availableKeys[0];
            console.log('Using first available combination key:', key);
            const encodedKey = encodeURIComponent(key);
            response = await api.get(`combinations/visualization/${encodedKey}`);
          }
        }
        
        const json = response.data;
        console.log("Successfully received visualization data:", json);
        
        console.log("Final visualization data:", json);
        setData(json);
        
        // Pass data to parent component if callback provided
        if (onDataLoaded) {
          onDataLoaded(json);
        }
      } catch (err: any) {
        console.error("Visualization fetch error:", err);
        setError(err.message || 'Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizationData();
  }, [location.search]); // Re-run when location.search changes

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: 18, color: '#666' }}>🔄 Görselleştirme yükleniyor...</div>
        <div style={{ fontSize: 14, color: '#888' }}>3D modeller ve grafikler hazırlanıyor</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: '8px' }}>
          URL: {location.search}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: 16,
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 20, color: '#d32f2f' }}>⚠️ Görselleştirme Hatası</div>
        <div style={{ fontSize: 14, color: '#666', maxWidth: 400 }}>{error}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
          💡 İpucu: Bir kombinasyon hesaplaması çalıştırın veya URL'ye ?key=combination_key ekleyin
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Lütfen önce bir hesaplama çalıştırın ve sonra tekrar deneyin.
        </div>
        <div style={{ fontSize: 12, color: '#999', marginTop: '8px' }}>
          URL: {location.search}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Don't render anything visual - just return null since the parent component handles rendering
  return null;
}
