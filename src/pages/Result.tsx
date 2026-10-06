import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { 
  DefaultComboInfo, 
  // CombinationResult, 
  UnitCosts, 
  OrderData, 
  // OrderItemData, 
  DefaultCombinationInfo, 
  DefaultValues,
  AllProductsCombinationResponse,
  GroupCombinationResponse,
  ProductsCombinationResponse,
  // Product
} from '../types/api';

// Helper function to translate cartoning method from English to Turkish
const translateCartoningMethod = (method: string): string => {
  console.log('🔍 [translateCartoningMethod] Input:', method, 'Type:', typeof method);
  if (!method) {
    console.log('🔴 [translateCartoningMethod] Method is falsy, returning N/A');
    return 'N/A';
  }
  const lowerMethod = method.toLowerCase();
  console.log('🔍 [translateCartoningMethod] Lower:', lowerMethod);
  
  // Handle both English and Turkish values
  if (lowerMethod === 'machine' || lowerMethod === 'makine') return 'Makine Kolileme';
  if (lowerMethod === 'hand' || lowerMethod === 'manuel' || lowerMethod === 'el') return 'Manuel Kolileme';
  
  console.log('🟡 [translateCartoningMethod] Unrecognized value, returning original:', method);
  return method; // Return original if not recognized
};

// Helper function to format order items in Turkish
const formatOrderItem = (item: any, orderData?: any, index?: number): string => {
  // If it's a DTO class name string, try to get data from orderData
  if (typeof item === 'string' && item.includes('OrderItemRequestDto')) {
    // Try to extract from OrderData if available
    if (orderData && orderData.OrderItems && Array.isArray(orderData.OrderItems) && index !== undefined) {
      const orderItem = orderData.OrderItems[index];
      if (orderItem && 'Percentage' in orderItem && 'Count' in orderItem) {
        return `%${orderItem.Percentage} (${orderItem.Count} kutu)`;
      }
    }
    return 'Veri yok';
  }
  
  // If it's already a formatted string (e.g., "40% (50 boxes)" or "%40 (50 kutu)")
  if (typeof item === 'string') {
    // Try to parse English format: "40% (50 boxes)"
    const englishMatch = item.match(/(\d+(?:\.\d+)?)%\s*\((\d+)\s*boxes?\)/i);
    if (englishMatch) {
      const percentage = englishMatch[1];
      const count = englishMatch[2];
      return `%${percentage} (${count} kutu)`;
    }
    
    // Try to parse Turkish format that might already exist
    const turkishMatch = item.match(/%?(\d+(?:\.\d+)?)\s*\((\d+)\s*kutu\)/i);
    if (turkishMatch) {
      const percentage = turkishMatch[1];
      const count = turkishMatch[2];
      return `%${percentage} (${count} kutu)`;
    }
    
    // If it's just a product key or other string, return as is
    return item;
  }
  
  // If it's an object with Percentage and Count properties
  if (typeof item === 'object' && item !== null && 'Percentage' in item && 'Count' in item) {
    return `%${item.Percentage} (${item.Count} kutu)`;
  }
  
  // Fallback
  return String(item);
};

const headerMap: Record<string, string> = {
  "Urun": "Ürün Adı",
  "Kutu": "Kutu Tipi",
  "Bundle?": "Bundle?",
  "Koli?": "Koli?",
  "Koli": "Koli",
  "Kolileme Yontemi": "Kolileme Yöntemi",
  "Palet tipi": "Palet Tipi",
  "Bundle 1. boyut kutu sayisi": "Bundle 1. Boyut",
  "Bundle 2. boyut kutu sayisi": "Bundle 2. Boyut",
  "Bundle 3. boyut kutu sayisi": "Bundle 3. Boyut",
  "Bundle ici kutu sayisi": "Bundle İçi Kutu Sayısı",
  "Koli ici adet": "Koli İçi Adet",
  "Koli Utilization (%)": "Koli Utilization (%)",
  "Mevcut Koli Utilization (%)": "Mevcut Koli Utilization (%)",
  "Koli Utilization Iyilesme (%)": "Koli Utilization İyileşme (%)",
  "Palet ici kutu sayisi": "Palet İçi Kutu Sayısı",
  "Palet ici bundle sayisi": "Palet İçi Bundle Sayısı",
  "Palet ici koli sayisi": "Palet İçi Koli Sayısı",
  "Palet Utilization (%)": "Palet Utilization (%)",
  "Mevcut Palet Utilization (%)": "Mevcut Palet Utilization (%)",
  "Palet Utilization Iyilesme (%)": "Palet Utilization İyileşme (%)",
  "Toplam Koli Sayisi": "Toplam Koli Sayısı",
  "Koli Maliyeti (₺)": "Koli Maliyeti (₺)",
  "Toplam Palet Sayisi": "Toplam Palet Sayısı",
  "Palet Maliyeti (₺)": "Palet Maliyeti (₺)",
  "Elleçleme Maliyeti (₺)": "Elleçleme Maliyeti (₺)",
  "Toplam Maliyet (₺)": "Toplam Maliyet (₺)",
  "Option": "Option",
  "Option ID": "Option ID",
  "SKU": "SKU",
  "Birim Maliyet - Kutu": "Birim Maliyet - Kutu (₺)",
  "Birim Maliyet - Koli": "Birim Maliyet - Koli (₺)",
  "Birim Maliyet - Palet": "Birim Maliyet - Palet (₺)",
  "Birim Maliyet - Elleçleme": "Birim Maliyet - Elleçleme (₺)",
  "Siparis Kutu Adedi": "Sipariş Kutu Adedi",
  "Siparis Dagilim (%)": "Sipariş Dağılım (%)"
};

// Table column definitions - Updated to match the required structure
const koliTableColumns = [
  "Option", "Koli", "Kolileme Yontemi", "Koli ici adet",
  "Koli Utilization (%)", "Mevcut Koli Utilization (%)", "Koli Utilization Iyilesme (%)"
];

const getPaletTableColumns = (includeOrderData: boolean) => [
  "Option", "Koli", "Palet ici kutu sayisi", "Palet ici bundle sayisi",
  "Palet ici koli sayisi", "Palet Utilization (%)", "Mevcut Palet Utilization (%)", "Palet Utilization Iyilesme (%)",
  ...(includeOrderData ? [] : ["CO2e (Kg)"])
];

const getMaliyetTableColumns = (includeOrderData: boolean) => [
  "Option", "Koli", "Toplam Koli Sayisi", "Koli Maliyeti (₺)",
  "Toplam Palet Sayisi", "Palet Maliyeti (₺)", "Elleçleme Maliyeti (₺)", "Toplam Maliyet (₺)",
  ...(includeOrderData ? ["CO2e (Kg)"] : [])
];

// Helper functions
const isOrderDataIncluded = (value: boolean | string | undefined): boolean => {
  return value === true || value === "TRUE";
};

const parseTSV = (tsv: string) => {
  const lines = tsv.trim().split(/\r?\n/);
  const headers = lines[0].split('\t');
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let expectedColumns = headers.length;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split('\t');
    
    if (currentRow.length === 0) {
      currentRow = columns;
    } else {
      currentRow[0] = currentRow[0] + ' ' + columns[0];
      for (let j = 1; j < columns.length; j++) {
        currentRow.push(columns[j]);
      }
    }
    
    if (currentRow.length >= expectedColumns) {
      const finalRow = currentRow.slice(0, expectedColumns);
      if (finalRow[0]) {
        finalRow[0] = finalRow[0].replace(/\s+/g, ' ').trim();
      }
      rows.push(finalRow);
      currentRow = [];
    }
  }
  
  if (currentRow.length > 0) {
    while (currentRow.length < expectedColumns) {
      currentRow.push('');
    }
    if (currentRow[0]) {
      currentRow[0] = currentRow[0].replace(/\s+/g, ' ').trim();
    }
    rows.push(currentRow.slice(0, expectedColumns));
  }
  
  return { headers, rows };
};

const getQueryParam = (search: string, key: string) => {
  const params = new URLSearchParams(search);
  const value = params.get(key);
  console.log(`Query param ${key}:`, value);
  return value;
};

const normalizeText = (input: unknown): string => String(input ?? '').toLowerCase();
const asText = (input: unknown): string => String(input ?? '');

const getDisplayValue = (header: string, value: string, _rowIndex?: number) => {
  const safeValue = asText(value);
  if (header === "Option") {
    // Use the actual value from the data, not the row index
    return `${safeValue}`;
  }
  
  if (header === "Bundle 1. boyut kutu sayisi" || 
      header === "Bundle 2. boyut kutu sayisi" || 
      header === "Bundle 3. boyut kutu sayisi") {
    const match = safeValue.match(/(\d+)/);
    return match ? match[1] : safeValue;
  }
  
  if (header === "Kolileme Yontemi") {
    switch (safeValue) {
      case "hand": return "El Ambalajı";
      case "machine": return "Makine";
      default: return safeValue;
    }
  }
  
  if (normalizeText(safeValue) === "true") return "Var";
  if (normalizeText(safeValue) === "false") return "Yok";
  
  return safeValue;
};

const getOriginalValue = (header: string, displayValue: string) => {
  if (header === "Kolileme Yontemi") {
    switch (displayValue) {
      case "El Ambalajı": return "hand";
      case "Makine": return "machine";
      default: return displayValue;
    }
  }
  
  if (displayValue === "Var") return "true";
  if (displayValue === "Yok") return "false";
  
  return displayValue;
};

const getUtilizationColor = (value: string, isImprovement: boolean = false) => {
  const numericValue = parseFloat(value);
  
  if (isNaN(numericValue)) {
    return { backgroundColor: '#f9f9f9', color: '#666' };
  }
  
  if (isImprovement) {
    if (numericValue > 0) {
      const intensity = Math.min(numericValue / 30, 1);
      const alpha = 0.1 + (intensity * 0.4);
      const backgroundColor = `rgba(46, 125, 50, ${alpha})`;
      const textColor = intensity > 0.6 ? '#1b5e20' : '#2e7d32';
      return { backgroundColor, color: textColor };
    } else if (numericValue < 0) {
      const intensity = Math.min(Math.abs(numericValue) / 15, 1);
      const alpha = 0.1 + (intensity * 0.4);
      const backgroundColor = `rgba(211, 47, 47, ${alpha})`;
      const textColor = intensity > 0.6 ? '#b71c1c' : '#d32f2f';
      return { backgroundColor, color: textColor };
    } else {
      return { backgroundColor: '#f5f5f5', color: '#757575' };
    }
  } else {
    if (numericValue < 30) {
      const alpha = 0.15 + ((30 - numericValue) / 30) * 0.25;
      return { backgroundColor: `rgba(244, 67, 54, ${alpha})`, color: '#c62828' };
    } else if (numericValue < 50) {
      const alpha = 0.1 + ((50 - numericValue) / 20) * 0.2;
      return { backgroundColor: `rgba(255, 152, 0, ${alpha})`, color: '#e65100' };
    } else if (numericValue < 70) {
      const alpha = 0.1 + ((numericValue - 50) / 20) * 0.15;
      return { backgroundColor: `rgba(255, 235, 59, ${alpha})`, color: '#f57f17' };
    } else if (numericValue < 85) {
      const alpha = 0.15 + ((numericValue - 70) / 15) * 0.2;
      return { backgroundColor: `rgba(139, 195, 74, ${alpha})`, color: '#558b2f' };
    } else {
      const alpha = 0.2 + ((numericValue - 85) / 15) * 0.3;
      return { backgroundColor: `rgba(76, 175, 80, ${alpha})`, color: '#2e7d32' };
    }
  }
};

const generateCombinationKey = (row: string[], headers: string[]) => {
  const getValue = (header: string) => {
    const index = headers.indexOf(header);
    return index >= 0 ? row[index] || '' : '';
  };

  const urun = getValue('Urun');
  const koli = getValue('Koli');
  const kolilemeYontemi = getValue('Kolileme Yontemi');

  // For the new API structure, we'll use a simpler key format
  const cartoningMethod = getOriginalValue('Kolileme Yontemi', kolilemeYontemi);
  return `${urun}_${koli}_${cartoningMethod}`;
};

const groupDataByProduct = (headers: string[], rows: string[][]) => {
  const productGroups: Record<string, string[][]> = {};
  
  rows.forEach(row => {
    const productName = row[headers.indexOf('Urun')] || '';
    if (!productGroups[productName]) {
      productGroups[productName] = [];
    }
    productGroups[productName].push(row);
  });
  
  return productGroups;
};

// Product Detail Component
const ProductDetail: React.FC<{
  productName: string;
  rows: string[][];
  headers: string[];
  isDefaultCombo: (row: string[], headers: string[]) => boolean;
  apiResponse?: AllProductsCombinationResponse | GroupCombinationResponse | ProductsCombinationResponse | null;
  defaultCombinations?: Record<string, DefaultCombinationInfo>;
  unitCosts?: UnitCosts | null;
  includeOrderData?: boolean | string;
  scenarioName?: string;
  scenarioId?: string;
  navigate: (path: string) => void;
}> = ({ productName, rows, headers, isDefaultCombo, apiResponse, defaultCombinations, unitCosts, includeOrderData, scenarioName, scenarioId, navigate }) => {
  // Mark unused parameters
  void scenarioName;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const getValue = (row: string[], header: string) => {
    const index = headers.indexOf(header);
    return index >= 0 ? (row[index] || '') : '';
  };
  

  const handleSort = (header: string) => {
    setSortConfig(prev => {
      if (prev?.key === header) {
        return prev.direction === 'asc' ? { key: header, direction: 'desc' } : null;
      }
      return { key: header, direction: 'asc' };
    });
  };

  const handleRowClick = (rowIndex: number) => {
    setSelectedRowIndex(selectedRowIndex === rowIndex ? null : rowIndex);
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = getValue(a, sortConfig.key);
      const bVal = getValue(b, sortConfig.key);
      
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      const comparison = aVal.localeCompare(bVal);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortConfig]);
  
  // "Koli İçi Adet" display: "50 kutu" or "72 kutu (72 bundle)"
  const isBundledProduct = !!apiResponse?.products?.find(p => p.ProductKey === productName)?.IsBundleRequired;
  const formatCartonContent = (row: string[], boxCount: string) => {
    if (!boxCount) return '';
    if (!isBundledProduct) return `${boxCount} kutu`;
    const bundleCount = getValue(row, 'Koli ici bundle sayisi');
    return bundleCount ? `${boxCount} kutu (${bundleCount} bundle)` : `${boxCount} kutu`;
  };

  const renderTable = (columns: string[], title: string) => {
    // Debug: Log table rendering
    console.log(`🔍 [Result.tsx] Rendering table "${title}" with columns:`, columns);
    console.log(`🔍 [Result.tsx] First row data:`, rows?.[0]);
    console.log(`🔍 [Result.tsx] First row length:`, rows?.[0]?.length);
    
    return (
    <div style={{ marginBottom: '24px' }}>
      <h4
        style={{
          margin: '0 0 12px 0',
          color: '#495057',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        {title}
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#1976d2', color: '#fff' }}>
              {columns.map((column) => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {headerMap[column] || column}
                    {sortConfig?.key === column && (
                      <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}

            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rIdx) => {
              const isDefault = isDefaultCombo(row, headers);
              generateCombinationKey(row, headers); // used for side effects
              const isSelected = selectedRowIndex === rIdx;
  
              return (
                <tr
                  key={rIdx}
                  onClick={() => handleRowClick(rIdx)}
                  style={{
                    backgroundColor: isSelected
                      ? '#e3f2fd'
                      : isDefault
                      ? '#fff3cd'
                      : rIdx % 2 === 0
                      ? '#f9f9f9'
                      : '#fff',
                    border: isSelected 
                      ? '2px solid #1976d2' 
                      : isDefault 
                      ? 'none' 
                      : '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDefault) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDefault) {
                      e.currentTarget.style.backgroundColor = rIdx % 2 === 0 ? '#f9f9f9' : '#fff';
                    }
                  }}
                >
                  {columns.map((column, cIdx) => {
                    const value = getValue(row, column);
                    console.log(`🔍 [Result.tsx] Row ${rIdx}, Column "${column}":`, value);
                    const isUtilizationColumn = column.includes('Utilization (%)');
                    const isImprovementColumn = column.includes('Iyilesme (%)');
                    const colorStyles =
                      isUtilizationColumn || isImprovementColumn
                        ? getUtilizationColor(value, isImprovementColumn)
                        : {};
  
                    return (
                      <td
                        key={column}
                        style={{
                          padding: '10px 8px',
                          fontSize: '14px',
                          position: 'relative',
                          ...(isDefault ? { boxShadow: 'inset 0px 0 0 0 #ffc107' } : {}),
                          ...colorStyles
                        }}
                      >
                        {/* Varsayılan satır için üst şerit + rozet sadece ilk sütunda */}
                        {isDefault && cIdx === 0 && (
                          <>
                            <span
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 0,
                                background: 'linear-gradient(90deg,#ffc107,#ff9800)'
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 2,
                                background: '#ffc107',
                                color: '#000',
                                fontSize: 10,
                                padding: '2px 4px',
                                borderRadius: 3,
                                fontWeight: 'bold'
                              }}
                            >
                              Varsayılan
                            </span>
                          </>
                        )}
                        
                        {/* Selected row indicator */}
                        {isSelected && cIdx === 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              left: 2,
                              background: '#1976d2',
                              color: '#fff',
                              fontSize: 10,
                              padding: '2px 4px',
                              borderRadius: 3,
                              fontWeight: 'bold'
                            }}
                          >
                            
                          </span>
                        )}
  
                        {isImprovementColumn && value ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {parseFloat(value) > 0 && (
                              <span style={{ fontSize: '12px', color: '#2e7d32' }}>▲</span>
                            )}
                            {parseFloat(value) < 0 && (
                              <span style={{ fontSize: '12px', color: '#d32f2f' }}>▼</span>
                            )}
                            {getDisplayValue(column, value, rIdx)}
                          </span>
                          ) : column === 'Koli ici adet' ? (
                          formatCartonContent(row, value)
                        ) : (
                          getDisplayValue(column, value, rIdx)
                        )}
                      </td>
                    );
                  })}
  

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    );
  };
  

  // Get first row for product info
  const firstRow = rows[0];
  const sku = getValue(firstRow, 'SKU');
  const kutu = getValue(firstRow, 'Kutu');
  const bundle = getValue(firstRow, 'Bundle?');
  const koli = getValue(firstRow, 'Koli?');
  const paletTipi = getValue(firstRow, 'Palet tipi');

  // Get product info from API response if available
  let productInfo = null;
  if (apiResponse && apiResponse.BestCombinations && apiResponse.products && apiResponse.products.length > 0) {
    // Find the product details from the products array
    const product = apiResponse.products.find(p => 
      p.ProductKey === productName
    );
    const bestCombination = apiResponse.BestCombinations.find(b => b.ProductKey === productName);
    if (product) {
      productInfo = {
        BoxKey: product.BoxKey,
        BundleRequired: product.IsBundleRequired ? 'Evet' : 'Hayır',
        CartonRequired: product.IsCartonRequired,
        CartoningMethod: bestCombination?.CartoningMethod || '',
        PaletType: product.PaletType || 'N/A'
      };
    }
  }

  // Find the default row for this product (used for reference)
  rows.find(row => isDefaultCombo(row, headers));

  // Check if all unit cost values are empty
  const hasUnitCosts = () => {
    const unitCostHeaders = [
      'Birim Maliyet - Kutu',
      'Birim Maliyet - Koli', 
      'Birim Maliyet - Palet',
      'Birim Maliyet - Elleçleme'
    ];
    
    return unitCostHeaders.some(header => {
      if (!headers.includes(header)) return false;
      const value = getValue(firstRow, header);
      return value && value.trim() !== '';
    });
  };

  const hasCostData = hasUnitCosts();

  // ===== Mevcut boşluklar kartı =====
  const currentProduct = apiResponse?.products?.find(p => p.ProductKey === productName);
  const currentCartonUtil = currentProduct?.CurrentCartonUtilization;
  const isOverFull = typeof currentCartonUtil === 'number' && currentCartonUtil > 100;

  // Sahada koli başına konan kutu ve modelin mevcut koliye yerleştirebildiği en fazla kutu
  const currentPerCarton = currentProduct && Number(currentProduct.NKoli) > 0
    ? Number(currentProduct.NBox) / Number(currentProduct.NKoli)
    : null;
  const ownCartonCounts = (apiResponse?.BestCombinations || [])
    .filter(b => b.ProductKey === productName && b.IsDefault)
    .map(b => Number(b.NBoxInCarton) || 0);
  const bestOwnCarton = ownCartonCounts.length > 0 ? Math.max(...ownCartonCounts) : null;
  const isOwnCartonWorse = currentPerCarton !== null && bestOwnCarton !== null && bestOwnCarton < currentPerCarton;
  const showGapCard = isOverFull || isOwnCartonWorse;

  // Hangi boşluk ayarları geçerli (makine / el)
  const productCombo = apiResponse?.BestCombinations?.find(b => b.ProductKey === productName);
  const methodText = String(productCombo?.CartoningMethod || '').toLowerCase();
  const isMachine = methodText === 'machine' || methodText === 'makine';
  const dv = apiResponse?.DefaultValues;

  // Tablo satırları: koli yönleri
  const fmtNum = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1));
  const gapAxes = [
    { label: 'En',  unit: 'kutu', current: currentProduct?.CurrentGapWidth,     count: currentProduct?.CurrentCountWidth,     setting: dv ? (isMachine ? dv.MachineGapWidth     : dv.HandGapWidth)     : undefined },
    { label: 'Boy',  unit: 'kutu', current: currentProduct?.CurrentGapThickness, count: currentProduct?.CurrentCountThickness, setting: dv ? (isMachine ? dv.MachineGapThickness : dv.HandGapThickness) : undefined },
    { label: 'Yükseklik', unit: 'kutu', current: currentProduct?.CurrentGapHeight,    count: currentProduct?.CurrentCountHeight,    setting: dv ? (isMachine ? dv.MachineGapHeight    : dv.HandGapHeight)    : undefined },
  ];
  const hasLayoutCounts = gapAxes.every(a => typeof a.count === 'number');
  const hasCurrentGap = gapAxes.some(a => a.current !== null && a.current !== undefined);
  const tightAxes = gapAxes.filter(a =>
    typeof a.current === 'number' && typeof a.setting === 'number' && a.current < a.setting);
  const fmtVal = (v?: number | null) => (typeof v === 'number' ? fmtNum(v) : '—');
  const totalBoxes = hasLayoutCounts ? gapAxes.reduce((t, a) => t * (a.count as number), 1) : null;

  // Uyarı metni için parçalar
  const tightNames = tightAxes.map((a, i) => (i === 0 ? a.label : a.label.toLocaleLowerCase('tr-TR')));
  const tightDirText = tightNames.length <= 1
    ? tightNames.join('')
    : `${tightNames.slice(0, -1).join(', ')} ve ${tightNames[tightNames.length - 1]}`;
  const tightSentence =
    tightAxes.length === 0 ? '' :
    tightAxes.length === 1
      ? `${tightDirText} yönündeki mevcut boşluk, gerekli boşluğun altında. `
      : `${tightDirText} yönlerindeki mevcut boşluklar, gerekli boşluğun altında. `;

  const fieldBoxCount = currentPerCarton ?? totalBoxes;
  const fieldCountText = fieldBoxCount !== null ? String(fmtNum(fieldBoxCount)) : null;
  const overPercent = isOverFull ? (currentCartonUtil! - 100).toFixed(2).replace('.', ',') : null;

  let warnTitle = '';
  let warnBody = '';
  if (isOverFull) {
    warnTitle = 'Mevcut yerleşim koli kapasitesini aşıyor.';
    warnBody =
      `Tanımlanan koli ve yerleşim kısıtları doğrultusunda ${fieldCountText ? `${fieldCountText} kutuluk yerleşim` : 'mevcut yerleşim'} için %${overPercent} ek kapasite gerekiyor.` +
      (isOwnCartonWorse && fieldCountText
        ? ` Bu kısıtlarla ${bestOwnCarton} kutu yerleştirilebiliyor.`
        : '');
  } else if (isOwnCartonWorse) {
    warnTitle = 'Mevcut kutu sayısının tamamı koliye yerleştirilemiyor.';
    warnBody = fieldCountText
      ? `Tanımlanan koli ve yerleşim kısıtları doğrultusunda ${bestOwnCarton} kutu yerleştirilebiliyor.`
      : `Tanımlanan koli ve yerleşim kısıtları doğrultusunda ${bestOwnCarton} kutu yerleştirilebiliyor.`;
  }

  return (
    <div style={{ padding: '16px', backgroundColor: 'white' }}>
      {/* Product Info Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: showGapCard
          ? 'minmax(220px, 1fr) minmax(300px, 1.2fr) minmax(420px, 1.6fr)'
          : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {/* Product Info Card */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          border: '1px solid #e9ecef' 
        }}>
          <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
            Ürün Bilgisi
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            {productInfo ? (
              <>
                <div><strong>Kutu Tipi:</strong> {productInfo.BoxKey || 'N/A'}</div>
                <div><strong>Bundle Gerekli Mi?</strong> {productInfo.BundleRequired || 'N/A'}</div>
                <div><strong>Koli Gerekli Mi?</strong> {productInfo.CartonRequired || 'N/A'}</div>
                <div><strong>Kolileme Yöntemi:</strong> {translateCartoningMethod(productInfo.CartoningMethod || '')}</div>
                <div><strong>Palet Tipi:</strong> {productInfo.PaletType || 'N/A'}</div>
              </>
            ) : (
              <>
                <div><strong>Kutu:</strong> {getDisplayValue('Kutu', kutu)}</div>
                <div><strong>Bundle:</strong> {getDisplayValue('Bundle?', bundle)}</div>
                <div><strong>Koli:</strong> {getDisplayValue('Koli?', koli)}</div>
                <div><strong>Palet Tipi:</strong> {getDisplayValue('Palet tipi', paletTipi)}</div>
                {sku && <div><strong>SKU:</strong> {sku}</div>}
              </>
            )}
          </div>
        </div>

        {/* Unit Costs Card */}
        {hasCostData && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px', 
            border: '1px solid #e9ecef' 
          }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
              Birim Maliyetler (₺)
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              {headers.includes('Birim Maliyet - Kutu') && (
                <div><strong>Kutu:</strong> {getValue(firstRow, 'Birim Maliyet - Kutu')} ₺</div>
              )}
              {headers.includes('Birim Maliyet - Koli') && (
                <div><strong>Koli:</strong> {getValue(firstRow, 'Birim Maliyet - Koli')} ₺</div>
              )}
              {headers.includes('Birim Maliyet - Palet') && (
                <div><strong>Palet:</strong> {getValue(firstRow, 'Birim Maliyet - Palet')} ₺</div>
              )}
              {headers.includes('Birim Maliyet - Elleçleme') && (
                <div><strong>Elleçleme:</strong> {getValue(firstRow, 'Birim Maliyet - Elleçleme')} ₺</div>
              )}
            </div>
          </div>
        )}

        {/* Order & Distribution Card */}
        {headers.includes('Siparis Kutu Adedi') && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px', 
            border: '1px solid #e9ecef' 
          }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
              Sipariş & Dağılım
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>Toplam Kutu:</strong> {getValue(firstRow, 'Siparis Kutu Adedi')}</div>
              {headers.includes('Siparis Dagilim (%)') && (
                <div><strong>Dağılım:</strong> {getValue(firstRow, 'Siparis Dagilim (%)')}</div>
              )}
            </div>
          </div>
        )}



        {/* Default Combination Info Card - Show when API response is available */}
        {apiResponse && apiResponse.BestCombinations && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fff3cd', 
            borderRadius: '8px', 
            border: '1px solid #ffeaa7' 
          }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#856404', fontSize: '14px', fontWeight: '600' }}>
              Varsayılan Kombinasyon
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
              {/* Product Details from products array */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '600', color: '#856404', fontSize: '13px', borderBottom: '1px solid #ffeaa7', paddingBottom: '4px' }}>
                  Ürün Detayları
                </div>
                <div><strong>Palet İçi Kutu Sayısı:</strong> {(() => {
                  // Find the product in the products array
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    return product ? product.NBox : 'N/A';
                  }
                  return 'N/A';
                })()}</div>
                <div><strong>Palet İçi Koli Sayısı:</strong> {(() => {
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    return product ? product.NKoli : 'N/A';
                  }
                  return 'N/A';
                })()}</div>
                <div><strong>Palet İçi Bundle Sayısı:</strong> {(() => {
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    return product ? product.NBundle : 'N/A';
                  }
                  return 'N/A';
                })()}</div>
                <div><strong>Varsayılan Koli Tipi:</strong> {(() => {
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    return product ? product.DefaultCartonKey : 'N/A';
                  }
                  return 'N/A';
                })()}</div>
              </div>

              {/* Current Utilization from default combination */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '600', color: '#856404', fontSize: '13px', borderBottom: '1px solid #ffeaa7', paddingBottom: '4px' }}>
                  Mevcut Utilization
                </div>
                <div><strong>Mevcut Koli Utilization:</strong> {(() => {
                  // Get from products array (which now includes default combination data)
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    if (product && typeof product.CurrentCartonUtilization === 'number') {
                      return `%${product.CurrentCartonUtilization.toFixed(2)}`;
                    }
                  }
                  return 'N/A';
                })()}</div>
                <div><strong>Mevcut Palet Utilization:</strong> {(() => {
                  // Get from products array (which now includes default combination data)
                  if (apiResponse.products && Array.isArray(apiResponse.products)) {
                    const product = apiResponse.products.find(p => p.ProductKey === productName);
                    if (product && typeof product.CurrentPalletUtilization === 'number') {
                      return `%${product.CurrentPalletUtilization.toFixed(2)}`;
                    }
                  }
                  return 'N/A';
                })()}</div>
              </div>
            </div>
          </div>
        )}
                {/* Current Gap Card - shown when current layout conflicts with the defined gap settings */}
        {apiResponse && apiResponse.BestCombinations && showGapCard && (
          <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
              <h5 style={{ margin: 0, color: '#495057', fontSize: '14px', fontWeight: 600 }}>
                Mevcut Boşluklar
              </h5>
              <span style={{ backgroundColor: '#fdecea', color: '#b71c1c', border: '1px solid #f5c2c7', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ⚠ Uyuşmuyor
              </span>
            </div>

            {/* Table */}
            {hasCurrentGap && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eef2f7', color: '#495057' }}>
                      {['Yön', 'Gerekli Boşluk (mm)', 'Sahadaki Boşluk (mm)', 'Sahadaki Kutu Sayısı', 'Durum'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Yön' ? 'left' : 'center', fontWeight: 600, fontSize: '12px', lineHeight: 1.3 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gapAxes.map(a => {
                      const isTight = tightAxes.includes(a);
                      const known = typeof a.current === 'number' && typeof a.setting === 'number';
                      return (
                        <tr key={a.label} style={{ borderTop: '1px solid #e9ecef' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{a.label}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{fmtVal(a.setting)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: isTight ? '#b71c1c' : undefined, fontWeight: isTight ? 600 : undefined }}>
                            {fmtVal(a.current)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {typeof a.count === 'number' ? `${a.count} ${a.unit}` : '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {known ? (
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                                backgroundColor: isTight ? '#fdecea' : '#e8f5e9',
                                color: isTight ? '#b71c1c' : '#2e7d32',
                                border: `1px solid ${isTight ? '#f5c2c7' : '#c8e6c9'}`
                              }}>
                                {isTight ? '✕ Uygunsuz' : '✓ Uygun'}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {totalBoxes !== null && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
                        <td colSpan={5} style={{ padding: '8px' }}>
                          <strong>Sahadaki yerleşim:</strong> {gapAxes.map(a => a.count).join(' × ')} = <strong style={{ color: '#b71c1c' }}>{totalBoxes} kutu</strong>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Warning */}
            <div style={{ marginTop: hasCurrentGap ? '12px' : 0, display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', backgroundColor: '#fdecea', border: '1px solid #f5c2c7', borderRadius: '6px' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
              <div>
                <div style={{ color: '#b71c1c', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {warnTitle}
                </div>
                <div style={{ color: '#495057', fontSize: '13px' }}>
                  {warnBody}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* API Response Info Card - Only show for new API responses */}
        {apiResponse && defaultCombinations && defaultCombinations[productName] && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '8px', 
            border: '1px solid #c8e6c9' 
          }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#2e7d32', fontSize: '14px', fontWeight: '600' }}>
              API Response Bilgileri
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '600', color: '#2e7d32', fontSize: '13px', borderBottom: '1px solid #a5d6a7', paddingBottom: '4px' }}>
                  Varsayılan Kombinasyon
                </div>
                <div><strong>Combination Key:</strong> {defaultCombinations[productName].CombinationKey}</div>
                <div><strong>Palet Efficiency:</strong> {defaultCombinations[productName].PalletEfficiency.toFixed(2)}%</div>
                <div><strong>Koli Efficiency:</strong> {defaultCombinations[productName].CartonEfficiency.toFixed(2)}%</div>
              </div>
              
              {unitCosts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#2e7d32', fontSize: '13px', borderBottom: '1px solid #a5d6a7', paddingBottom: '4px' }}>
                    Birim Maliyetler
                  </div>
                  <div><strong>Palet Maliyeti:</strong> {unitCosts.UnitPalletCost} ₺</div>
                  <div><strong>Elleçleme Maliyeti:</strong> {unitCosts.HandlingCost} ₺</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Information Card - Show when includeOrderData is true */}
        {apiResponse && apiResponse.IncludeOrderData && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px', 
            border: '1px solid #bbdefb' 
          }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#1976d2', fontSize: '14px', fontWeight: '600' }}>
              Sipariş Bilgileri
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>Toplam Kutu Sayısı:</strong> {apiResponse.TotalBoxCount || 'N/A'}</div>
              <div>
                <strong>Sipariş Kalemleri:</strong>
                {apiResponse.OrderItems && Array.isArray(apiResponse.OrderItems) ? (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                    {apiResponse.OrderItems.map((item, index) => (
                      <li key={index}>{formatOrderItem(item, apiResponse.OrderData, index)}</li>
                    ))}
                  </ul>
                ) : apiResponse.OrderItems ? (
                  <span> {formatOrderItem(apiResponse.OrderItems, apiResponse.OrderData, 0)}</span>
                ) : (
                  <span> N/A</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tables */}
      {renderTable(koliTableColumns, 'Koli Tablosu')}
      {renderTable(getPaletTableColumns(isOrderDataIncluded(includeOrderData)), 'Palet Tablosu')}
      
      {/* Show cost table only if includeOrderData is true or if we have cost data from old format */}
      {(isOrderDataIncluded(includeOrderData) || hasCostData) && (
        <>
          {renderTable(getMaliyetTableColumns(isOrderDataIncluded(includeOrderData)), 'Maliyet Tablosu')}
        </>
      )}

      {/* Visualization Button */}
      {apiResponse && apiResponse.BestCombinations && (
        <div style={{ 
          marginTop: '24px',
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <h5 style={{ 
                margin: '0 0 8px 0', 
                color: '#495057', 
                fontSize: '16px', 
                fontWeight: '600' 
              }}>
                🎯 3D Görselleştirme
              </h5>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                {selectedRowIndex !== null 
                  ? `Seçilen kombinasyonun 3D görselleştirmesini görüntüleyin`
                  : `Görselleştirme için önce bir kombinasyon seçin`
                }
              </div>
              <div style={{ fontSize: '13px', color: '#495057' }}>
                <strong>Ürün:</strong> {productName} | 
                <strong> Kombinasyon Sayısı:</strong> {rows.length}
                {selectedRowIndex !== null && (
                  <> | <strong>Seçilen:</strong> Option {getValue(sortedRows[selectedRowIndex], "Option")}</>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                
                // Navigate to visualization with productId and optionNumber
                if (selectedRowIndex !== null && selectedRowIndex < sortedRows.length) {
                  const selectedRow = sortedRows[selectedRowIndex];
                  // Get the option number from the selected row's "Option" column
                  const optionNumber = getValue(selectedRow, "Option");
                  const productId = productName;
                  // Get the file name from the URL query parameter
                  const filePath = getQueryParam(location.search, 'file');
                  let fileName = '';
                  if (filePath) {
                    // Extract just the filename from the path
                    fileName = filePath.split('/').pop() || '';
                    // If it's a .xlsx file, convert to .json
                    if (fileName.endsWith('.xlsx')) {
                      fileName = fileName.replace('.xlsx', '.json');
                    }
                    // Remove "_results" from the filename if it exists
                    if (fileName.includes('_results_')) {
                      fileName = fileName.replace('_results_', '_');
                    }
                    // Ensure the filename starts with "scenario_" if it doesn't already
                    if (!fileName.startsWith('scenario_')) {
                      fileName = 'scenario_' + fileName;
                    }
                  }
                  // Navigate to visualization with productId, optionNumber, fileName, and scenarioId
                  let navigationUrl = `/visualization?productId=${encodeURIComponent(productId)}&optionNumber=${optionNumber}`;
                  if (fileName) {
                    navigationUrl += `&fileName=${encodeURIComponent(fileName)}`;
                  }
                  if (scenarioId) {
                    navigationUrl += `&scenarioId=${encodeURIComponent(scenarioId)}`;
                  }
                  navigate(navigationUrl);
                } else {
                  console.log('🔴 No row selected!');
                }
              }}
              disabled={selectedRowIndex === null}
              style={{
                backgroundColor: selectedRowIndex !== null ? '#1976d2' : '#cccccc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: selectedRowIndex !== null ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s ease',
                boxShadow: selectedRowIndex !== null ? '0 4px 12px rgba(25, 118, 210, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                minWidth: '180px',
                justifyContent: 'center',
                opacity: selectedRowIndex !== null ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (selectedRowIndex !== null) {
                  e.currentTarget.style.backgroundColor = '#1565c0';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 118, 210, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRowIndex !== null) {
                  e.currentTarget.style.backgroundColor = '#1976d2';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                }
              }}
              title={selectedRowIndex !== null ? "Bu ürün için görselleştirme sayfasına git" : "Lütfen önce bir kombinasyon seçin"}
            >
              🎨 Görselleştir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Result: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [defaultCombos, setDefaultCombos] = useState<DefaultComboInfo>({});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // New state for updated response structure
  const [apiResponse, setApiResponse] = useState<AllProductsCombinationResponse | GroupCombinationResponse | ProductsCombinationResponse | null>(null);
  const [runDateTime, setRunDateTime] = useState<string>('');
  const [unitCosts, setUnitCosts] = useState<UnitCosts | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [defaultCombinations, setDefaultCombinations] = useState<Record<string, DefaultCombinationInfo>>({});
  const [defaultValues, setDefaultValues] = useState<DefaultValues | null>(null);
  const [includeOrderData, setIncludeOrderData] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarioId, setScenarioId] = useState<string>('');
  
  // Global filters state
  const [_globalFilters, _setGlobalFilters] = useState({
    prodId: [] as string[],
    optionNo: [] as string[],
    koli: [] as string[]
  });
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdown(null);
        setDropdownSearch(prev => ({ ...prev, [openDropdown]: '' }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    setFileContent(null);
    setError(null);
    setApiResponse(null);
    setIsLoading(false);
    
    const storedDefaultCombos = localStorage.getItem('defaultCombos');
    if (storedDefaultCombos) {
      try {
        const parsed = JSON.parse(storedDefaultCombos);
        setDefaultCombos(parsed);
      } catch (err) {
        setDefaultCombos({});
      }
    }
    
    const filePath = getQueryParam(location.search, 'file');
    const scenarioId = getQueryParam(location.search, 'scenarioId');
    console.log('Full location.search:', location.search);
    console.log('Full location.pathname:', location.pathname);
    console.log('File path:', filePath);
    console.log('Scenario ID:', scenarioId);
    
    if (scenarioId) {
      // New database-based approach using scenario ID
      console.log('Loading results from database using scenario ID:', scenarioId);
      
      setIsLoading(true);
      setScenarioId(scenarioId); // Store the scenarioId in state
      
      api.get(`scenarios/${encodeURIComponent(scenarioId)}/formatted-results`)
        .then(res => {
          const data = res.data;
          console.log('🔍 [Result.tsx] Received data from database:', data);
          
          // Handle the new database response format
          if (data.runDetails && data.combinations && data.products) {
            console.log('🔍 [Result.tsx] Raw API data.combinations[0]:', JSON.stringify(data.combinations[0], null, 2));
            setApiResponse({
              Message: data.runDetails.notes || '',
              FilePath: '', // No file path for database results
              RunDateTime: data.runDetails.runDate || new Date().toISOString(),
              UnitCosts: {
                UnitPalletCost: data.runDetails.unitPalletCost || 0,
                HandlingCost: data.runDetails.handlingCost || 0
              },
              OrderData: undefined, // Not available in this format
              DefaultCombinations: {}, // Will be populated below
              DefaultValues: {
                MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
                MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
                MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
                PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
                PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
                HandGapWidth: data.runDetails.handGapWidth || 0,
                HandGapThickness: data.runDetails.handGapThickness || 0,
                HandGapHeight: data.runDetails.handGapHeight || 0,
                MachineGapWidth: data.runDetails.machineGapWidth || 0,
                MachineGapThickness: data.runDetails.machineGapThickness || 0,
                MachineGapHeight: data.runDetails.machineGapHeight || 0,
                UnitPalletCost: data.runDetails.unitPalletCost || 0,
                HandlingCost: data.runDetails.handlingCost || 0
              },
              IncludeOrderData: data.runDetails.includeOrderData || false,
              TotalBoxCount: data.runDetails.totalBoxCount,
              OrderItems: data.runDetails.orderItems,
              BestCombinations: data.combinations.map((combo: any) => ({
                CombinationNumber: combo.option,
                ProductKey: combo.productKey,
                CartonKey: combo.cartonKey,
                PalletUtilization: combo.palletUtilization.toFixed(2),
                CartonUtilization: combo.koliUtilization.toFixed(2),
                CurrentCartonUtilization: combo.currentCartonUtilization.toFixed(2) || 0,
                CartonUtilizationImprovement: combo.cartonUtilizationImprovement.toFixed(2) || 0,
                CurrentPalletUtilization: combo.currentPalletUtilization.toFixed(2) || 0,
                PalletUtilizationImprovement: combo.palletUtilizationImprovement.toFixed(2) || 0,
                NBoxInPallet: combo.nBox,
                NCartonInPallet: combo.nKoli,
                NBundleInPallet: combo.nBundle,
                NBoxInCarton: combo.nBoxInCarton || 0,
                TotalCost: combo.totalCost,
                CartoningMethod: combo.cartoningMethod,
                CO2e: combo.co2e ? parseFloat(combo.co2e).toFixed(2) : '0.00',
                IsDefault: combo.isDefault,
                TotalCartonCount: combo.totalKoliCount,
                TotalCartonCost: combo.koliCost,
                TotalPalletCount: combo.totalPalletCount,
                TotalPalletCost: combo.palletCost,
                TotalHandlingCost: combo.handlingCost,
                CombinationDetails: combo.combinationDetails
              })),
              products: data.products.map((product: any) => ({
                ProductKey: product.productKey,
                ProductName: product.productName,
                // Default combination values
                NBox: product.nBox,
                NKoli: product.nKoli,
                NBundle: product.nBundle,
                DefaultCartonKey: product.defaultCartonKey,
                CurrentCartonUtilization: product.currentCartonUtilization,
                CurrentPalletUtilization: product.currentPalletUtilization,
                // Current gaps
                CurrentGapWidth: product.currentGapWidth,
                CurrentGapThickness: product.currentGapThickness,
                CurrentGapHeight: product.currentGapHeight,
                CurrentLayoutNote: product.currentLayoutNote,
                CurrentCountWidth: product.currentCountWidth,
                CurrentCountThickness: product.currentCountThickness,
                CurrentCountHeight: product.currentCountHeight,
                CurrentBoxEdgeWidth: product.currentBoxEdgeWidth,
                CurrentBoxEdgeThickness: product.currentBoxEdgeThickness,
                CurrentBoxEdgeHeight: product.currentBoxEdgeHeight,
                // Product details
                BoxKey: product.boxKey,
                IsBundleRequired: product.isBundleRequired,
                IsCartonRequired: product.isCartonRequired,
                PaletType: product.paletType
              }))
            });
            
            setRunDateTime(data.runDetails.runDate || '');
            setUnitCosts({
              UnitPalletCost: data.runDetails.unitPalletCost || 0,
              HandlingCost: data.runDetails.handlingCost || 0
            });
            setDefaultValues({
              MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
              MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
              MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
              PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
              PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
              HandGapWidth: data.runDetails.handGapWidth || 0,
              HandGapThickness: data.runDetails.handGapThickness || 0,
              HandGapHeight: data.runDetails.handGapHeight || 0,
              MachineGapWidth: data.runDetails.machineGapWidth || 0,
              MachineGapThickness: data.runDetails.machineGapThickness || 0,
              MachineGapHeight: data.runDetails.machineGapHeight || 0,
              UnitPalletCost: data.runDetails.unitPalletCost || 0,
              HandlingCost: data.runDetails.handlingCost || 0
            });
            setIncludeOrderData(data.runDetails.includeOrderData || false);
            setScenarioName(data.runDetails.scenarioName || '');
          }
        })
        .catch((err: any) => {
          console.error('Error loading scenario results:', err);
          if (err.response?.status === 404) {
            setError('Senaryo bulunamadı.');
          } else {
            setError(err.response?.data?.message || err.message || 'Senaryo sonuçları yüklenemedi.');
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (filePath) {
      // Legacy file-based approach (keep for backward compatibility)
      console.log('Loading results from file:', filePath);
      
      // Check if this is a full API endpoint or just a filename
      let apiEndpoint = filePath;
      
      // If it's just a filename, construct the full API endpoint
      if (!filePath.startsWith('/api/')) {
        // Clean up the filename - ensure it has the right extension and format
        let cleanFilename = filePath;
        
        // If filename doesn't have .xlsx extension, try to find the correct file
        if (!cleanFilename.endsWith('.xlsx') && !cleanFilename.endsWith('.txt')) {
          cleanFilename = cleanFilename + '.xlsx';
        }
        
        // Remove any leading underscore and ensure it has 'results' prefix if needed
        if (cleanFilename.startsWith('_')) {
          cleanFilename = cleanFilename.substring(1);
        }
        
        // Ensure filename matches expected format: {scenario}_results_{timestamp}.xlsx
        if (!cleanFilename.includes('results_') && cleanFilename.includes('_20')) {
          const parts = cleanFilename.split('_');
          if (parts.length >= 3) {
            const scenario = parts[0];
            const datePart = parts[1];
            const timePart = parts[2].replace('.txt', '').replace('.xlsx', '');
            cleanFilename = `${scenario}_results_${datePart}_${timePart}.xlsx`;
          }
        }
        
        apiEndpoint = `combinations/result/${encodeURIComponent(cleanFilename)}`;
        console.log('Cleaned filename:', cleanFilename);
      }
      
      console.log('Original filePath:', filePath);
      console.log('API endpoint to call:', apiEndpoint);
      console.log('URL decoded filePath:', decodeURIComponent(filePath));
      
      setIsLoading(true);
      
      api.get(apiEndpoint)
        .then(res => {
          const data = res.data;
          // Debug: Log the received data to see what's actually coming from the backend
          console.log('🔍 [Result.tsx] Received data from backend:', data);
          console.log('🔍 [Result.tsx] First combination full object:', data.combinations?.[0]);
          console.log('🔍 [Result.tsx] Total combinations:', data.combinations?.length);
          
          
          
          // Handle the new API response format from /api/combinations/result/
          if (data.runDetails && data.combinations && data.products) {
            console.log(`data denemesi:`, data);
            console.log('🔍 [Result.tsx] Raw API data.combinations[0] (main path):', JSON.stringify(data.combinations[0], null, 2));
            // This is the new format from combinations API
            setApiResponse({
              Message: data.runDetails.notes || '',
              FilePath: filePath || '',
              RunDateTime: data.runDetails.runDate || new Date().toISOString(),
              UnitCosts: {
                UnitPalletCost: data.runDetails.unitPalletCost || 0,
                HandlingCost: data.runDetails.handlingCost || 0
              },
              OrderData: undefined, // Not available in this format
              DefaultCombinations: {}, // Will be populated below
              DefaultValues: {
                MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
                MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
                MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
                PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
                PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
                HandGapWidth: data.runDetails.handGapWidth || 0,
                HandGapThickness: data.runDetails.handGapThickness || 0,
                HandGapHeight: data.runDetails.handGapHeight || 0,
                MachineGapWidth: data.runDetails.machineGapWidth || 0,
                MachineGapThickness: data.runDetails.machineGapThickness || 0,
                MachineGapHeight: data.runDetails.machineGapHeight || 0,
                UnitPalletCost: data.runDetails.unitPalletCost || 0,
                HandlingCost: data.runDetails.handlingCost || 0
              },
              IncludeOrderData: data.runDetails.includeOrderData || false,
              TotalBoxCount: data.runDetails.totalBoxCount,
              OrderItems: data.runDetails.orderItems,

              BestCombinations: data.combinations.map((combo: any, index: number) => {
                console.warn(`!!!!!!! MAPPING COMBO ${index} - cartoningMethod:`, combo.cartoningMethod, 'Type:', typeof combo.cartoningMethod);
                return {
                  OptionNumber: combo.option || (index + 1),
                  CombinationNumber: combo.option ? combo.option : (index + 1).toString(),
                  ProductKey: combo.productKey || '',
                  BoxKey: combo.boxKey || '',
                  BundleRequired: combo.bundleRequired || '',
                  CartonRequired: combo.cartonRequired || '',
                  CartonKey: combo.cartonKey || '',
                  CartoningMethod: combo.cartoningMethod || '',
                  PaletType: combo.paletType || '',
                  NumBoxX: combo.numBoxX || 0,
                  NumBoxY: combo.numBoxY || 0,
                  NumBoxZ: combo.numBoxZ || 0,
                  BundleWidth: combo.bundleWidth || 0,
                  BundleThickness: combo.bundleThickness || 0,
                  BundleHeight: combo.bundleHeight || 0,
                  NBoxInBundle: combo.nBoxInBundle || 0,
                  NumBundleX: combo.numBundleX || 0,
                  NumBundleY: combo.numBundleY || 0,
                  NumBundleZ: combo.numBundleZ || 0,
                  NBoxInCarton: combo.nBoxInCarton || 0,
                  CartonUtilization: combo.koliUtilization || 0,
                  CurrentCartonUtilization: combo.currentCartonUtilization || combo.CurrentCartonUtil || 0,
                  CartonUtilizationImprovement: combo.cartonUtilizationImprovement || 0,
                  PaletW1Count: combo.paletW1Count || 0,
                  PaletW2Count: combo.paletW2Count || 0,
                  PaletT1Count: combo.paletT1Count || 0,
                  PaletT2Count: combo.paletT2Count || 0,
                  PaletHCount: combo.paletHCount || 0,
                  NBoxInPallet: combo.nBox || 0,
                  NBundleInPallet: combo.nBundle || 0,
                  NCartonInPallet: combo.nKoli || 0,
                  PalletUtilization: combo.palletUtilization || 0,
                  CurrentPalletUtilization: combo.CurrentPalletUtilization || combo.CurrentPalletUtil || 0,
                  PalletUtilizationImprovement: combo.palletUtilizationImprovement || 0,
                  CurrentStatus: combo.currentStatus || '',
                  TotalCartonCount: combo.totalKoliCount || 0,
                  PalletCount: combo.totalPalletCount || 0,
                  CartonCost: combo.koliCost || 0,
                  PalletCost: combo.palletCost || 0,
                  HandlingCost: combo.handlingCost || 0,
                  TotalCost: combo.totalCost || 0,
                  cartoningMethod: combo.cartoningMethod,
                  CO2e: combo.co2e ? parseFloat(combo.co2e).toFixed(2) : '0.00',
                  IsDefault: combo.isDefault || false
                };
              }),
              products: (data.products || []).map((p: any) => ({
                ProductKey: p.productKey,
                ProductName: p.productName,
                NBox: p.nBox,
                NKoli: p.nKoli,
                NBundle: p.nBundle,
                DefaultCartonKey: p.defaultCartonKey,
                CurrentCartonUtilization: p.currentCartonUtilization,
                CurrentPalletUtilization: p.currentPalletUtilization,
                BoxKey: p.boxKey,
                IsBundleRequired: p.isBundleRequired,
                IsCartonRequired: p.isCartonRequired,
              }))

            });
            
            // Extract default combinations
            const defaultCombos: DefaultComboInfo = {};
            data.combinations.forEach((combo: any) => {
              if (combo.isDefault) {
                defaultCombos[combo.productKey] = `${combo.productKey}_${combo.cartonKey}`;
              }
            });
            setDefaultCombos(defaultCombos);
            
            // Set other state variables
            setRunDateTime(data.runDetails.runDate || new Date().toISOString());
            setScenarioName(data.runDetails.scenarioName || '');
            setUnitCosts({
              UnitPalletCost: data.runDetails.unitPalletCost || 0,
              HandlingCost: data.runDetails.handlingCost || 0
            });
            setOrderData(null);
            setDefaultCombinations({});
            setDefaultValues({
              MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
              MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
              MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
              PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
              PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
              HandGapWidth: data.runDetails.handGapWidth || 0,
              HandGapThickness: data.runDetails.handGapThickness || 0,
              HandGapHeight: data.runDetails.handGapHeight || 0,
              MachineGapWidth: data.runDetails.machineGapWidth || 0,
              MachineGapThickness: data.runDetails.machineGapThickness || 0,
              MachineGapHeight: data.runDetails.machineGapHeight || 0,
              UnitPalletCost: data.runDetails.unitPalletCost || 0,
              HandlingCost: data.runDetails.handlingCost || 0
            });
            console.log('Setting includeOrderData from API response (main):', data.runDetails.includeOrderData, 'Type:', typeof data.runDetails.includeOrderData);
            setIncludeOrderData(data.runDetails.includeOrderData || false);
            
            // Debug: Log the table column configuration
            console.log('🔍 [Result.tsx] includeOrderData:', data.runDetails.includeOrderData);
            console.log('🔍 [Result.tsx] isOrderDataIncluded:', isOrderDataIncluded(data.runDetails.includeOrderData));
            console.log('🔍 [Result.tsx] PaletTableColumns:', getPaletTableColumns(isOrderDataIncluded(data.runDetails.includeOrderData)));
            console.log('🔍 [Result.tsx] MaliyetTableColumns:', getMaliyetTableColumns(isOrderDataIncluded(data.runDetails.includeOrderData)));
            
            // Debug: Check the mapped data after setApiResponse
            setTimeout(() => {
              console.log('🔍 [Result.tsx] After setApiResponse - checking state data');
              // We can't access the state directly here, but we can check what was sent to setApiResponse
            }, 100);
          } else {
            // Handle old format for backward compatibility
            setApiResponse(data);
            setRunDateTime(data.RunDateTime);
            setUnitCosts(data.UnitCosts);
            setOrderData(data.OrderData || null);
            setDefaultCombinations((data as any).DefaultCombinations || {});
            setDefaultValues(data.DefaultValues);
            setIncludeOrderData((data as any).IncludeOrderData === "TRUE" || (data as any).IncludeOrderData === true);
            
            // Convert new default combinations format to old format for compatibility
            const newDefaultCombos: DefaultComboInfo = {};
            Object.entries((data as any).DefaultCombinations || {}).forEach(([productKey, info]) => {
              newDefaultCombos[productKey] = (info as DefaultCombinationInfo).CombinationKey;
            });
            setDefaultCombos(newDefaultCombos);
          }
          
          // Store in localStorage
          localStorage.setItem('lastApiResponse', JSON.stringify(data));
          localStorage.setItem('lastResultFilePath', filePath);
        })
        .catch(async (err) => {
          console.error('First attempt failed:', err);
          
          // Try alternative filename formats if the first attempt fails
          if (filePath && !filePath.startsWith('/api/')) {
            const alternatives = [];
            
            // Try original filename with different extensions
            let baseFilename = filePath.replace(/\.(txt|xlsx)$/, '');
            alternatives.push(`${baseFilename}.xlsx`);
            alternatives.push(`${baseFilename}.txt`);
            
            // Try adding/removing 'results' prefix
            if (baseFilename.includes('_20')) {
              const parts = baseFilename.split('_');
              if (parts.length >= 3 && !baseFilename.includes('results_')) {
                const scenario = parts[0].replace(/^_/, '');
                const datePart = parts[1];
                const timePart = parts[2];
                alternatives.push(`${scenario}_results_${datePart}_${timePart}.xlsx`);
              }
            }
            
            // Try each alternative
            for (const altFilename of alternatives) {
              try {
                console.log('Trying alternative filename:', altFilename);
                const altResponse = await api.get(`combinations/result/${encodeURIComponent(altFilename)}`);
                const data = altResponse.data;
                  console.log(data);
                  
                  // Handle the new API response format
                  if (data.runDetails && data.combinations && data.products) {
                    // This is the new format from combinations API
                    setApiResponse({
                      Message: data.runDetails.notes || '',
                      FilePath: filePath || '',
                      RunDateTime: data.runDetails.runDate || new Date().toISOString(),
                      UnitCosts: {
                        UnitPalletCost: data.runDetails.unitPalletCost || 0,
                        HandlingCost: data.runDetails.handlingCost || 0
                      },
                      OrderData: undefined,
                      DefaultCombinations: {},
                      DefaultValues: {
                        MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
                        MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
                        MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
                        PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
                        PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
                        HandGapWidth: data.runDetails.handGapWidth || 0,
                        HandGapThickness: data.runDetails.handGapThickness || 0,
                        HandGapHeight: data.runDetails.handGapHeight || 0,
                        MachineGapWidth: data.runDetails.machineGapWidth || 0,
                        MachineGapThickness: data.runDetails.machineGapThickness || 0,
                        MachineGapHeight: data.runDetails.machineGapHeight || 0,
                        UnitPalletCost: data.runDetails.unitPalletCost || 0,
                        HandlingCost: data.runDetails.handlingCost || 0
                      },
                      IncludeOrderData: data.runDetails.includeOrderData || false,
                      TotalBoxCount: data.runDetails.totalBoxCount,
                      OrderItems: data.runDetails.orderItems,

                      BestCombinations: data.combinations.map((combo: any, index: number) => ({
                        OptionNumber: combo.option || (index + 1),
                        CombinationNumber: combo.option ? combo.option : (index + 1).toString(),
                        ProductKey: combo.productKey || '',
                        BoxKey: combo.boxKey || '',
                        BundleRequired: combo.bundleRequired || '',
                        CartonRequired: combo.cartonRequired || '',
                        CartonKey: combo.cartonKey || '',
                        CartoningMethod: combo.cartoningMethod || '',
                        PaletType: combo.paletType || '',
                        NumBoxX: combo.numBoxX || 0,
                        NumBoxY: combo.numBoxY || 0,
                        NumBoxZ: combo.numBoxZ || 0,
                        BundleWidth: combo.bundleWidth || 0,
                        BundleThickness: combo.bundleThickness || 0,
                        BundleHeight: combo.bundleHeight || 0,
                        NBoxInBundle: combo.nBoxInBundle || 0,
                        NumBundleX: combo.numBundleX || 0,
                        NumBundleY: combo.numBundleY || 0,
                        NumBundleZ: combo.numBundleZ || 0,
                        NBoxInCarton: combo.nBoxInCarton || 0,
                        CartonUtilization: combo.cartonUtilization || 0,
                        CurrentCartonUtilization: combo.currentCartonUtilization || 0,
                        CartonUtilizationImprovement: combo.cartonUtilizationImprovement || 0,
                        PaletW1Count: combo.paletW1Count || 0,
                        PaletW2Count: combo.paletW2Count || 0,
                        PaletT1Count: combo.paletT1Count || 0,
                        PaletT2Count: combo.paletT2Count || 0,
                        PaletHCount: combo.paletHCount || 0,
                        NBoxInPallet: combo.nBoxInPallet || 0,
                        NBundleInPallet: combo.nBundleInPallet || 0,
                        NCartonInPallet: combo.nCartonInPallet || 0,
                        PalletUtilization: combo.palletUtilization || 0,
                        CurrentPalletUtilization: combo.currentPalletUtilization || 0,
                        PalletUtilizationImprovement: combo.palletUtilizationImprovement || 0,
                        CurrentStatus: combo.currentStatus || '',
                        TotalCartonCount: combo.totalCartonCount || 0,
                        PalletCount: combo.palletCount || 0,
                        CartonCost: combo.cartonCost || 0,
                        PalletCost: combo.palletCost || 0,
                        HandlingCost: combo.handlingCost || 0,
                        TotalCost: combo.totalCost || 0,
                        cartoningMethod: combo.cartoningMethod,
                        CO2e: combo.cO2e ? parseFloat(combo.cO2e).toFixed(2) : '0.00',
                        IsDefault: combo.isDefault || false
                      })),
                      products: (data.products || []).map((p: any) => ({
                        ProductKey: p.productKey,
                        ProductName: p.productName,
                        NBox: p.nBox,
                        NKoli: p.nKoli,
                        NBundle: p.nBundle,
                        DefaultCartonKey: p.defaultCartonKey,
                        CurrentCartonUtilization: p.currentCartonUtilization,
                        CurrentPalletUtilization: p.currentPalletUtilization,
                        BoxKey: p.boxKey,
                        IsBundleRequired: p.isBundleRequired,
                        IsCartonRequired: p.isCartonRequired,
                      })) // Add the products array
                    });
                    
                    // Extract default combinations
                    const defaultCombos: DefaultComboInfo = {};
                    data.combinations.forEach((combo: any) => {
                      if (combo.isDefault) {
                        defaultCombos[combo.productKey] = `${combo.productKey}_${combo.cartonKey}`;
                      }
                    });
                    setDefaultCombos(defaultCombos);
                    
                    // Set other state variables
                    setRunDateTime(data.runDetails.runDate || new Date().toISOString());
                    setScenarioName(data.runDetails.scenarioName || '');
                    setUnitCosts({
                      UnitPalletCost: data.runDetails.unitPalletCost || 0,
                      HandlingCost: data.runDetails.handlingCost || 0
                    });
                    setOrderData(null);
                    setDefaultCombinations({});
                    setDefaultValues({
                      MaxNumBoxesInABundle: data.runDetails.maxNumBoxesInABundle || 0,
                      MaxNumBoxesInAnyBundleDimension: data.runDetails.maxNumBoxesInAnyBundleDimension || 0,
                      MaxNumBoxesStackedInCarton: data.runDetails.maxNumBoxesStackedInCarton || 0,
                      PaletMaxOverhang: data.runDetails.paletMaxOverhang || 0,
                      PaletMaxUnderhang: data.runDetails.paletMaxUnderhang || 0,
                      HandGapWidth: data.runDetails.handGapWidth || 0,
                      HandGapThickness: data.runDetails.handGapThickness || 0,
                      HandGapHeight: data.runDetails.handGapHeight || 0,
                      MachineGapWidth: data.runDetails.machineGapWidth || 0,
                      MachineGapThickness: data.runDetails.machineGapThickness || 0,
                      MachineGapHeight: data.runDetails.machineGapHeight || 0,
                      UnitPalletCost: data.runDetails.unitPalletCost || 0,
                      HandlingCost: data.runDetails.handlingCost || 0
                    });
                    console.log('Setting includeOrderData from API response (alternative):', data.runDetails.includeOrderData, 'Type:', typeof data.runDetails.includeOrderData);
                    setIncludeOrderData(data.runDetails.includeOrderData || false);
                  } else {
                    // Handle old format for backward compatibility
                    setApiResponse(data);
                    setRunDateTime(data.RunDateTime);
                    setUnitCosts(data.UnitCosts);
                    setOrderData(data.OrderData || null);
                    setDefaultCombinations((data as any).DefaultCombinations || {});
                    setDefaultValues(data.DefaultValues);
                    setIncludeOrderData((data as any).IncludeOrderData === "TRUE" || (data as any).IncludeOrderData === true);
                    
                    const newDefaultCombos: DefaultComboInfo = {};
                    Object.entries((data as any).DefaultCombinations || {}).forEach(([productKey, info]) => {
                      newDefaultCombos[productKey] = (info as DefaultCombinationInfo).CombinationKey;
                    });
                    setDefaultCombos(newDefaultCombos);
                  }
                  
                  localStorage.setItem('lastApiResponse', JSON.stringify(data));
                  localStorage.setItem('lastResultFilePath', filePath);
                  return;
              } catch (altErr) {
                console.error(`Alternative ${altFilename} failed:`, altErr);
              }
            }
          }
          
          setError(err.message || 'Sonuç dosyası yüklenemedi.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Try to load from localStorage
      const localApiResponse = localStorage.getItem('lastApiResponse');
      const localContent = localStorage.getItem('lastResultFileContent');
      const localFilePath = localStorage.getItem('lastResultFilePath');
      
      if (localApiResponse) {
        try {
          const parsed = JSON.parse(localApiResponse);
          console.log([parsed]);
          // Handle the new API response format
          if (parsed.runDetails && parsed.combinations && parsed.products) {
            // This is the new format from combinations API
            setApiResponse({
              Message: parsed.runDetails.notes || '',
              FilePath: parsed.FilePath || '',
              RunDateTime: parsed.runDetails.runDate || new Date().toISOString(),
              UnitCosts: {
                UnitPalletCost: parsed.runDetails.unitPalletCost || 0,
                HandlingCost: parsed.runDetails.handlingCost || 0
              },
              OrderData: undefined,
              DefaultCombinations: {},
              DefaultValues: {
                MaxNumBoxesInABundle: parsed.runDetails.maxNumBoxesInABundle || 0,
                MaxNumBoxesInAnyBundleDimension: parsed.runDetails.maxNumBoxesInAnyBundleDimension || 0,
                MaxNumBoxesStackedInCarton: parsed.runDetails.maxNumBoxesStackedInCarton || 0,
                PaletMaxOverhang: parsed.runDetails.paletMaxOverhang || 0,
                PaletMaxUnderhang: parsed.runDetails.paletMaxUnderhang || 0,
                HandGapWidth: parsed.runDetails.handGapWidth || 0,
                HandGapThickness: parsed.runDetails.handGapThickness || 0,
                HandGapHeight: parsed.runDetails.handGapHeight || 0,
                MachineGapWidth: parsed.runDetails.machineGapWidth || 0,
                MachineGapThickness: parsed.runDetails.machineGapThickness || 0,
                MachineGapHeight: parsed.runDetails.machineGapHeight || 0,
                UnitPalletCost: parsed.runDetails.unitPalletCost || 0,
                HandlingCost: parsed.runDetails.handlingCost || 0
              },
              IncludeOrderData: parsed.runDetails.includeOrderData || false,
              TotalBoxCount: parsed.runDetails.totalBoxCount,
              OrderItems: parsed.runDetails.orderItems,

              BestCombinations: parsed.combinations.map((combo: any, index: number) => ({
                OptionNumber: combo.option || (index + 1),
                CombinationNumber: combo.option ? combo.option : (index + 1).toString(),
                ProductKey: combo.productKey || '',
                BoxKey: combo.boxKey || '',
                BundleRequired: combo.bundleRequired || '',
                CartonRequired: combo.cartonRequired || '',
                CartonKey: combo.cartonKey || '',
                CartoningMethod: combo.cartoningMethod || '',
                PaletType: combo.paletType || '',
                NumBoxX: combo.numBoxX || 0,
                NumBoxY: combo.numBoxY || 0,
                NumBoxZ: combo.numBoxZ || 0,
                BundleWidth: combo.bundleWidth || 0,
                BundleThickness: combo.bundleThickness || 0,
                BundleHeight: combo.bundleHeight || 0,
                NBoxInBundle: combo.nBoxInBundle || 0,
                NumBundleX: combo.numBundleX || 0,
                NumBundleY: combo.numBundleY || 0,
                NumBundleZ: combo.numBundleZ || 0,
                NBoxInCarton: combo.nBoxInCarton || 0,
                CartonUtilization: combo.cartonUtilization || 0,
                CurrentCartonUtilization: combo.currentCartonUtilization || 0,
                CartonUtilizationImprovement: combo.cartonUtilizationImprovement || 0,
                PaletW1Count: combo.paletW1Count || 0,
                PaletW2Count: combo.paletW2Count || 0,
                PaletT1Count: combo.paletT1Count || 0,
                PaletT2Count: combo.paletT2Count || 0,
                PaletHCount: combo.paletHCount || 0,
                NBoxInPallet: combo.nBoxInPallet || 0,
                NBundleInPallet: combo.nBundleInPallet || 0,
                NCartonInPallet: combo.nCartonInPallet || 0,
                PalletUtilization: combo.palletUtilization || 0,
                CurrentPalletUtilization: combo.currentPalletUtilization || 0,
                PalletUtilizationImprovement: combo.palletUtilizationImprovement || 0,
                CurrentStatus: combo.currentStatus || '',
                TotalCartonCount: combo.totalCartonCount || 0,
                PalletCount: combo.palletCount || 0,
                CartonCost: combo.cartonCost || 0,
                PalletCost: combo.palletCost || 0,
                HandlingCost: combo.handlingCost || 0,
                TotalCost: combo.totalCost || 0,
                CO2e: combo.cO2e ? parseFloat(combo.cO2e).toFixed(2) : '0.00',
                IsDefault: combo.isDefault || false
              })),
              products: (parsed.products || []).map((p: any) => ({
                ProductKey: p.productKey,
                ProductName: p.productName,
                NBox: p.nBox,
                NKoli: p.nKoli,
                NBundle: p.nBundle,
                DefaultCartonKey: p.defaultCartonKey,
              }))
            });
            
            // Extract default combinations
            const defaultCombos: DefaultComboInfo = {};
            parsed.combinations.forEach((combo: any) => {
              if (combo.isDefault) {
                defaultCombos[combo.productKey] = `${combo.productKey}_${combo.cartonKey}`;
              }
            });
            setDefaultCombos(defaultCombos);
            
            // Set other state variables
            setRunDateTime(parsed.runDetails.runDate || new Date().toISOString());
            setScenarioName(parsed.runDetails.scenarioName || '');
            setUnitCosts({
              UnitPalletCost: parsed.runDetails.unitPalletCost || 0,
              HandlingCost: parsed.runDetails.handlingCost || 0
            });
            setOrderData(null);
            setDefaultCombinations({});
            setDefaultValues({
              MaxNumBoxesInABundle: parsed.runDetails.maxNumBoxesInABundle || 0,
              MaxNumBoxesInAnyBundleDimension: parsed.runDetails.maxNumBoxesInAnyBundleDimension || 0,
              MaxNumBoxesStackedInCarton: parsed.runDetails.maxNumBoxesStackedInCarton || 0,
              PaletMaxOverhang: parsed.runDetails.paletMaxOverhang || 0,
              PaletMaxUnderhang: parsed.runDetails.paletMaxUnderhang || 0,
              HandGapWidth: parsed.runDetails.handGapWidth || 0,
              HandGapThickness: parsed.runDetails.handGapThickness || 0,
              HandGapHeight: parsed.runDetails.handGapHeight || 0,
              MachineGapWidth: parsed.runDetails.machineGapWidth || 0,
              MachineGapThickness: parsed.runDetails.machineGapThickness || 0,
              MachineGapHeight: parsed.runDetails.machineGapHeight || 0,
              UnitPalletCost: parsed.runDetails.unitPalletCost || 0,
              HandlingCost: parsed.runDetails.handlingCost || 0
            });
            console.log('Setting includeOrderData from localStorage (new format):', parsed.runDetails.includeOrderData, 'Type:', typeof parsed.runDetails.includeOrderData);
            setIncludeOrderData(parsed.runDetails.includeOrderData || false);
          } else {
            // Handle old format for backward compatibility
            setApiResponse(parsed);
            setRunDateTime(parsed.RunDateTime);
            setUnitCosts(parsed.UnitCosts);
            setOrderData(parsed.OrderData || null);
            setDefaultCombinations((parsed as any).DefaultCombinations || {});
            setDefaultValues(parsed.DefaultValues);
            setIncludeOrderData((parsed as any).IncludeOrderData === "TRUE" || (parsed as any).IncludeOrderData === true);
            
            const newDefaultCombos: DefaultComboInfo = {};
            Object.entries((parsed as any).DefaultCombinations || {}).forEach(([productKey, info]) => {
              newDefaultCombos[productKey] = (info as DefaultCombinationInfo).CombinationKey;
            });
            setDefaultCombos(newDefaultCombos);
          }
        } catch (err) {
          setDefaultCombos({});
        }
      } else if (localContent && localFilePath) {
        setFileContent(localContent);
      } else {
        setError('Sonuç dosyası bulunamadı veya yüklenemedi.');
      }
    }
  }, [location.search]);

  const getCurrentScenarioName = () => {
    // Use the scenarioName state variable that's set from the API response
    if (scenarioName && scenarioName.trim() !== '') {
      return scenarioName;
    }
    
    // Fallback: Check if it's in the Message field (old format)
    if (apiResponse && apiResponse.Message) {
      const message = apiResponse.Message;
      
      // Extract scenario name from "Scenario: NAME" pattern
      const scenarioMatch = message.match(/Scenario:\s*([^\n]+)/i);
      if (scenarioMatch) {
        return scenarioMatch[1].trim();
      }
      
      // Look for other scenario name patterns
      const altMatch = message.match(/scenario\s+([^,\.]+)/i);
      if (altMatch) {
        return altMatch[1].trim();
      }
    }
    
    // Try to extract from filename in the URL
    const filePath = getQueryParam(location.search, 'file');
    if (filePath) {
      const filename = filePath.split('/').pop();
      if (filename) {
        // Try different filename patterns
        const match = filename.match(/^(.+?)__\d{8}_\d{6}\.txt$/);
        if (match) {
          return match[1].replace(/_/g, ' ');
        }
        const fallbackMatch = filename.match(/^(.+?)_\d{8}_\d{6}\.txt$/);
        if (fallbackMatch) {
          return fallbackMatch[1].replace(/_/g, ' ');
        }
        // Remove file extension and return
        return filename.replace(/\.(txt|xlsx?)$/i, '');
      }
    }
    return null;
  };

  const handleDownloadExcel = async () => {
    const filePath = getQueryParam(location.search, 'file');
    const scenarioIdFromUrl = scenarioId || getQueryParam(location.search, 'scenarioId');

    setDownloading(true);

    try {
      if (scenarioIdFromUrl) {
        const response = await api.get(`scenarios/${encodeURIComponent(scenarioIdFromUrl)}/download-details`, {
          responseType: 'blob'
        });
        const contentDisposition = response.headers['content-disposition'];
        const fileNameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        const downloadedFilename = fileNameMatch
          ? decodeURIComponent(fileNameMatch[1])
          : `${getCurrentScenarioName() || 'scenario'}_details.xlsx`;
        const blob = response.data;
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = downloadedFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
        return;
      }

      if (!filePath) {
        alert('Dosya bilgisi bulunamadı.');
        return;
      }

      let filename = filePath.split('/').pop() || '';
      
      if (filename.endsWith('.json')) {
        filename = filename.replace('.json', '.xlsx');
      }
      
      if (!filename.endsWith('.xlsx')) {
        filename = filename + '.xlsx';
      }
      
      console.log('Attempting to download file:', filename);
      const response = await api.get(`combinations/download-result/${encodeURIComponent(filename)}`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error: any) {
      console.error('Download error:', error);
      if (error.response?.status === 404) {
        alert('Senaryo detayları bulunamadı.');
      } else {
        alert('Dosya indirme hatası: ' + (error.response?.statusText || error.message));
      }
      alert('Dosya indirme sırasında bir hata oluştu.');
    } finally {
      setDownloading(false);
    }
  };

  const processedData = useMemo(() => {
    if (apiResponse) {
      console.log(apiResponse);
      // New API response structure - Updated to match the required table structure
      const headers = [
        'Option', 'Urun', 'Koli', 'Kolileme Yontemi', 'Koli ici adet',
        'Koli Utilization (%)', 'Mevcut Koli Utilization (%)', 'Koli Utilization Iyilesme (%)',
        'Palet ici kutu sayisi', 'Palet ici bundle sayisi', 'Palet ici koli sayisi',
        'Palet Utilization (%)', 'Mevcut Palet Utilization (%)', 'Palet Utilization Iyilesme (%)',
        'Toplam Koli Sayisi', 'Koli Maliyeti (₺)', 'Toplam Palet Sayisi', 'Palet Maliyeti (₺)',
        'Elleçleme Maliyeti (₺)', 'Toplam Maliyet (₺)', 'CO2e (Kg)','Koli ici bundle sayisi'
      ];
      
      // Convert API response to table rows with correct mapping
      const rows: string[][] = [];
      apiResponse.BestCombinations.forEach((combo, index) => {
        console.log(`🔍 [Result.tsx] Combo ${index}:`, {
          CombinationNumber: combo.CombinationNumber,
          ProductKey: combo.ProductKey,
          CartonKey: combo.CartonKey,
          CartoningMethod: combo.CartoningMethod,
          CartoningMethodType: typeof combo.CartoningMethod,
          // Cost fields
          TotalCartonCost: combo.TotalCartonCost,
          TotalPalletCount: combo.TotalPalletCount,
          TotalPalletCost: combo.TotalPalletCost,
          TotalHandlingCost: combo.TotalHandlingCost,
          TotalCost: combo.TotalCost
        });
        const row = [
          combo.CombinationNumber || `Option ${index + 1}`,
          combo.ProductKey || '',
          combo.CartonKey || '',
          translateCartoningMethod(combo.CartoningMethod),
          combo.NBoxInCarton?.toString() || '',
          combo.CartonUtilization?.toString() || '',
          combo.CurrentCartonUtilization?.toString() || '',
          combo.CartonUtilizationImprovement?.toString() || '',
          combo.NBoxInPallet?.toString() || '',
          combo.NBundleInPallet?.toString() || '',
          combo.NCartonInPallet?.toString() || '',
          combo.PalletUtilization?.toString() || '',
          combo.CurrentPalletUtilization?.toString() || '',
          combo.PalletUtilizationImprovement?.toString() || '',
          combo.TotalCartonCount?.toString() || '',
          combo.TotalCartonCost?.toString() || '',
          combo.TotalPalletCount?.toString() || '',
          combo.TotalPalletCost?.toString() || '',
          combo.TotalHandlingCost?.toString() || '',
          combo.TotalCost?.toString() || '',
          combo.CO2e?.toString() || '',
          (() => {
            const cd: any = (combo as any).CombinationDetails;
            const nx = cd?.numBundleX ?? cd?.NumBundleX;
            const ny = cd?.numBundleY ?? cd?.NumBundleY;
            const nz = cd?.numBundleZ ?? cd?.NumBundleZ;
            return [nx, ny, nz].every(v => typeof v === 'number') ? String(nx * ny * nz) : '';
          })()
        ];
        rows.push(row);
      });
      
      
      const productGroups = groupDataByProduct(headers, rows);
      return { headers, rows, productGroups };
    }
    
    if (!fileContent) return { headers: [], rows: [], productGroups: {} };
    
    // Old file-based approach
    const { headers, rows } = parseTSV(fileContent);
    
    // Check if Option column already exists in the data
    const optionIndex = headers.indexOf('Option');
    if (optionIndex >= 0) {
      // Option column already exists, use the existing data
      const productGroups = groupDataByProduct(headers, rows);
      return { headers, rows, productGroups };
    }
    
    // Add Option column with per-product numbering for Excel data
    const headersWithOption = ['Option', ...headers];
    const rowsWithOption: string[][] = [];
    
    // Group by product first to assign per-product option numbers
    const productGroups = groupDataByProduct(headers, rows);
    
    Object.entries(productGroups).forEach(([_productName, productRows]) => {
      productRows.forEach((row, index) => {
        const optionNumber = index + 1; // Per-product option numbering (1, 2, 3, 4, etc.)
        const rowWithOption = [optionNumber.toString(), ...row];
        rowsWithOption.push(rowWithOption);
      });
    });
    
    const finalProductGroups = groupDataByProduct(headersWithOption, rowsWithOption);
    
    return { headers: headersWithOption, rows: rowsWithOption, productGroups: finalProductGroups };
  }, [fileContent, apiResponse, orderData]);

  const isDefaultCombo = (row: string[], headers: string[]) => {
    const combinationKey = generateCombinationKey(row, headers);
    const productKey = row[headers.indexOf('Urun')] || '';
    return defaultCombos[productKey] === combinationKey;
  };


  const toggleProductExpansion = (productName: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productName)) {
        newSet.delete(productName);
      } else {
        newSet.add(productName);
      }
      return newSet;
    });
  };

  const [selectedProdId, setSelectedProdId] = useState('Tümü');
  const [selectedOptionNo, setSelectedOptionNo] = useState('Tümü');
  const [selectedKoli, setSelectedKoli] = useState('Tümü');
  const [downloading, setDownloading] = useState(false);

  // Reset filters
  const resetFilters = () => {
    setSelectedProdId('Tümü');
    setSelectedOptionNo('Tümü');
    setSelectedKoli('Tümü');
    setDropdownSearch({});
    setOpenDropdown(null);
  };

  // Handle filter changes
  const handleProdIdChange = (value: string) => {
    setSelectedProdId(value);
    setSelectedOptionNo('Tümü');
    setSelectedKoli('Tümü');
  };

  const handleOptionNoChange = (value: string) => {
    setSelectedOptionNo(value);
    setSelectedKoli('Tümü');
  };

  const handleKoliChange = (value: string) => {
    setSelectedKoli(value);
  };

  // Get available options for dependent dropdowns
  const availableOptionNos = useMemo(() => {
    if (selectedProdId === 'Tümü') return [];
    const productRows = processedData.productGroups[selectedProdId] || [];
    const optionNos = new Set<string>();
    
    // Debug: Check what columns are available
    console.log('Available headers:', processedData.headers);
    console.log('Product rows for', selectedProdId, ':', productRows);
    
    productRows.forEach((row, rowIndex) => {
      const optionIndex = processedData.headers.indexOf('Option');
      if (optionIndex >= 0) {
        const optionValue = row[optionIndex];
        if (optionValue && optionValue.trim() !== '') {
          // Use the display value for consistency with the table display
          const displayValue = getDisplayValue('Option', optionValue, rowIndex);
          optionNos.add(displayValue);
        }
      }
    });
    
    const result = Array.from(optionNos).sort();
    console.log('Available option numbers:', result);
    return result;
  }, [selectedProdId, processedData.productGroups, processedData.headers]);
  
  const availableKolis = useMemo(() => {
    if (selectedProdId === 'Tümü' || selectedOptionNo === 'Tümü') return [];
    const productRows = processedData.productGroups[selectedProdId] || [];
    const kolis = new Set<string>();
    
    productRows.forEach((row, rowIndex) => {
      const optionIndex = processedData.headers.indexOf('Option');
      const koliIndex = processedData.headers.indexOf('Koli');
      if (optionIndex >= 0 && koliIndex >= 0) {
        const optionValue = row[optionIndex];
        const koliValue = row[koliIndex];
        // Compare with display value for Option to match the filter dropdown
        const optionDisplayValue = getDisplayValue('Option', optionValue, rowIndex);
        if (optionDisplayValue === selectedOptionNo && koliValue && koliValue.trim() !== '') {
          kolis.add(koliValue);
        }
      }
    });
    
    const result = Array.from(kolis).sort();
    console.log('Available kolis for option', selectedOptionNo, ':', result);
    return result;
  }, [selectedProdId, selectedOptionNo, processedData.productGroups, processedData.headers]);

  // Filter the data based on selected filters
  const filteredProductGroups = useMemo(() => {
    if (selectedProdId === 'Tümü' && selectedOptionNo === 'Tümü' && selectedKoli === 'Tümü') {
      return processedData.productGroups;
    }
    
    const filtered: Record<string, string[][]> = {};
    
    Object.entries(processedData.productGroups).forEach(([productName, rows]) => {
      if (selectedProdId !== 'Tümü' && productName !== selectedProdId) return;
      
      const filteredRows = rows.filter((row, rowIndex) => {
        const optionIndex = processedData.headers.indexOf('Option');
        const koliIndex = processedData.headers.indexOf('Koli');
        
        if (optionIndex < 0 || koliIndex < 0) return true;
        
        const option = row[optionIndex];
        const koli = row[koliIndex];
        
        // Compare with display value for Option to match the filter dropdown
        if (selectedOptionNo !== 'Tümü') {
          const optionDisplayValue = getDisplayValue('Option', option, rowIndex);
          if (optionDisplayValue !== selectedOptionNo) return false;
        }
        if (selectedKoli !== 'Tümü' && koli !== selectedKoli) return false;
        
        return true;
      });
      
      if (filteredRows.length > 0) {
        filtered[productName] = filteredRows;
      }
    });
    
    return filtered;
  }, [selectedProdId, selectedOptionNo, selectedKoli, processedData.productGroups, processedData.headers]);

  if (error) {
    return (
      <div className="main-content">
        <h2 style={{ margin: '8px 0 24px 0', fontSize: '28px', fontWeight: '600', color: '#333', textAlign: 'left' }}>Sonuçlar</h2>
        <div style={{ marginTop: 32, color: '#b00020', fontWeight: 500 }}>
          {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="main-content">
        <h2 style={{ margin: '8px 0 24px 0', fontSize: '28px', fontWeight: '600', color: '#333', textAlign: 'left' }}>Sonuçlar</h2>
        <div style={{ marginTop: 32, color: '#888', fontWeight: '500' }}>
          Sonuç verisi yükleniyor...
        </div>
      </div>
    );
  }

  if (!fileContent && !apiResponse) {
    return (
      <div className="main-content">
        <h2 style={{ margin: '8px 0 24px 0', fontSize: '28px', fontWeight: '600', color: '#333', textAlign: 'left' }}>Sonuçlar</h2>
        <div style={{ marginTop: 32, color: '#888', fontWeight: 500 }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '95vw', margin: '0 auto', paddingTop: 16, paddingBottom: 48 }}>
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '8px 0 24px 0', fontSize: '28px', fontWeight: '600', color: '#333', textAlign: 'left' }}>Sonuçlar</h2>
        
        {/* Scenario Details Card */}
        {getCurrentScenarioName() && (
          <div style={{ 
            padding: '24px',
            backgroundColor: '#e3f2fd',
            borderRadius: '16px',
            border: '1px solid #bbdefb',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.12)',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '20px' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  border: '2px solid #90caf9'
                }}>
                  📊
                </div>
                <div>
                  <h3 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '20px', 
                    fontWeight: '600',
                    color: '#1976d2'
                  }}>
                    Senaryo Detayları
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#495057',
                    fontWeight: '500'
                  }}>
                    {getCurrentScenarioName()}
                  </div>
                </div>
              </div>
              
              {/* Download Button */}
              <button
                onClick={handleDownloadExcel}
                disabled={downloading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: downloading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
                  transition: 'all 0.2s ease',
                  opacity: downloading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!downloading) {
                    e.currentTarget.style.backgroundColor = '#218838';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!downloading) {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.2)';
                  }
                }}
                title={downloading ? "İndiriliyor..." : "Excel sonuç dosyasını indir"}
              >
                {downloading ? (
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '14px' }}></i>
                ) : (
                  <i className="fa-solid fa-download" style={{ fontSize: '14px' }}></i>
                )}
                {downloading ? 'İndiriliyor...' : 'Senaryo Detaylarını İndir'}
              </button>
            </div>
            
            {/* Four Cards Row */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Scenario Name Card */}
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  SENARYO ADI
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#495057',
                  fontWeight: '600',
                  wordBreak: 'break-word'
                }}>
                  {getCurrentScenarioName()}
                </div>
              </div>

              {/* Run Time Card */}
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  ÇALIŞTIRMA ZAMANI
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#495057',
                  fontWeight: '600'
                }}>
                  {runDateTime ? new Date(runDateTime).toLocaleString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </div>
              </div>

              {/* Status Card */}
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  DURUM
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#d4edda',
                  borderRadius: '6px'
                }}>
                  <i className="fa-solid fa-check" style={{ color: '#28a745', fontSize: '14px' }}></i>
                  <span style={{ color: '#28a745', fontWeight: '600', fontSize: '14px' }}>Başarılı</span>
                </div>
              </div>

              {/* Total Combinations Card */}
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  TOPLAM KOMBINASYON
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#495057',
                  fontWeight: '600'
                }}>
                  {apiResponse?.BestCombinations?.length || 0} Adet
                </div>
              </div>
            </div>

            {/* Scenario Notes Card - Only show if there are notes */}
            {apiResponse?.Message && apiResponse.Message.trim() !== '' && (
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  SENARYO NOTLARI
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: '#495057',
                  fontWeight: '600'
                }}>
                  {apiResponse.Message}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Scenario and Default Values Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Enhanced Scenario info - Keep this section but it won't duplicate the name now */}
          {false && (
            <div style={{ 
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '16px',
              border: '1px solid #bbdefb',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.12)',
              color: '#495057',
              position: 'relative'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    border: '2px solid #bbdefb'
                  }}>
                    📊
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '18px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Senaryo Detayları
                    </h3>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#6c757d',
                      fontWeight: '500'
                    }}>
                      {getCurrentScenarioName()}
                    </div>
                  </div>
                </div>
                
                {/* Download Button */}
                <button
                  onClick={handleDownloadExcel}
                  disabled={downloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: downloading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
                    transition: 'all 0.2s ease',
                    opacity: downloading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!downloading) {
                      e.currentTarget.style.backgroundColor = '#218838';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!downloading) {
                      e.currentTarget.style.backgroundColor = '#28a745';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.2)';
                    }
                  }}
                  title={downloading ? "İndiriliyor..." : "Excel sonuç dosyasını indir"}
                >
                  {downloading ? (
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '14px' }}></i>
                  ) : (
                    <i className="fa-solid fa-download" style={{ fontSize: '14px' }}></i>
                  )}
                  {downloading ? 'İndiriliyor...' : 'Senaryo Detaylarını İndir'}
                </button>
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '20px', 
                flexWrap: 'wrap',
                marginTop: '16px'
              }}>
                {/* Scenario Name */}
                <div style={{
                  backgroundColor: '#fff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  minWidth: '200px'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6c757d', 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '500'
                  }}>
                    Senaryo Adı
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    {getCurrentScenarioName()}
                  </div>
                </div>

                {/* Run Date/Time */}
                {runDateTime && (
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    minWidth: '200px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d', 
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Çalıştırma Zamanı
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      {new Date(runDateTime).toLocaleString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                {/* API Response Status */}
                {apiResponse && (
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    minWidth: '200px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d', 
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Durum
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: '#2e7d32',
                      backgroundColor: '#e8f5e8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      ✅ Başarılı
                    </div>
                  </div>
                )}

                {/* Total Combinations */}
                {apiResponse?.BestCombinations && (
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    minWidth: '200px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d', 
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Toplam Kombinasyon
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      {apiResponse?.BestCombinations?.length} Adet
                    </div>
                  </div>
                )}

                {/* Scenario Notes */}
                {apiResponse?.Message && (
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    minWidth: '250px',
                    flex: '1'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d', 
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Senaryo Notları
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#495057',
                      lineHeight: '1.4'
                    }}>
                      {apiResponse?.Message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
                    {/* Default Values Summary - moved under scenario name */}
          {apiResponse && defaultValues && (
            <div style={{ 
              display: 'flex', 
              gap: '24px', 
              marginBottom: '24px',
              alignItems: 'flex-start'
            }}>
              {/* Left side - Default Values */}
              <div style={{ 
                flex: 1,
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                fontSize: '13px', 
                color: '#495057'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
                  Varsayılan Değerler
                </h4>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                  {/* Bundle Settings */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '6px', 
                    border: '1px solid #e9ecef' 
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: '#495057' }}>
                      Bundle Ayarları
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      <div>Max Kutu Sayısı Bundle: {defaultValues.MaxNumBoxesInABundle}</div>
                      <div>Max Kutu Sayısı Herhangi Boyut: {defaultValues.MaxNumBoxesInAnyBundleDimension}</div>
                      <div>Max Kutu Sayısı Koli İçi: {defaultValues.MaxNumBoxesStackedInCarton}</div>
                    </div>
                  </div>

                  {/* Pallet Settings */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '6px', 
                    border: '1px solid #e9ecef' 
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: '#495057' }}>
                      Palet Ayarları
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      <div>Max Overhang: {defaultValues.PaletMaxOverhang}</div>
                      <div>Max Underhang: {defaultValues.PaletMaxUnderhang}</div>
                    </div>
                  </div>

                  {/* Hand Gap Settings */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '6px', 
                    border: '1px solid #e9ecef' 
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: '#495057' }}>
                      Manuel Kolileme Boşlukları
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      <div>Genişlik: {defaultValues.HandGapWidth}</div>
                      <div>Kalınlık: {defaultValues.HandGapThickness}</div>
                      <div>Yükseklik: {defaultValues.HandGapHeight}</div>
                    </div>
                  </div>

                  {/* Machine Gap Settings */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '6px', 
                    border: '1px solid #e9ecef' 
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px', color: '#495057' }}>
                      Makine Kolileme Boşlukları
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      <div>Genişlik: {defaultValues.MachineGapWidth}</div>
                      <div>Kalınlık: {defaultValues.MachineGapThickness}</div>
                      <div>Yükseklik: {defaultValues.MachineGapHeight}</div>
                    </div>
                  </div>

                 </div>
               </div>

               {/* Right side - Renk Kodlaması Legend */}
               <div style={{ 
                 minWidth: '200px',
                 padding: '16px', 
                 backgroundColor: '#fff', 
                 borderRadius: '8px', 
                 border: '1px solid #e0e0e0',
                 boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
               }}>
                 <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '13px', fontWeight: '600' }}>
                   Renk Kodlaması
                 </h5>
                 
                 <div style={{ display: 'flex', gap: '20px' }}>
                   {/* Utilization Colors */}
                   <div>
                     <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '6px', fontWeight: '500' }}>
                       Utilization:
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <div style={{
                           width: '12px', 
                           height: '12px', 
                           backgroundColor: 'rgba(244, 67, 54, 0.3)', 
                           borderRadius: '2px',
                           border: '1px solid rgba(244, 67, 54, 0.5)'
                         }}></div>
                         <span style={{ fontSize: '11px', color: '#495057' }}>&lt;50%</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <div style={{ 
                           width: '12px', 
                           height: '12px', 
                           backgroundColor: 'rgba(255, 235, 59, 0.3)', 
                           borderRadius: '2px',
                           border: '1px solid rgba(255, 235, 59, 0.5)'
                         }}></div>
                         <span style={{ fontSize: '11px', color: '#495057' }}>50-70%</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <div style={{ 
                           width: '12px', 
                           height: '12px', 
                           backgroundColor: 'rgba(76, 175, 80, 0.3)', 
                           borderRadius: '2px',
                           border: '1px solid rgba(76, 175, 80, 0.5)'
                         }}></div>
                         <span style={{ fontSize: '11px', color: '#495057' }}>&gt;70%</span>
                       </div>
                     </div>
                   </div>

                   {/* Improvement Arrows */}
                   <div>
                     <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '6px', fontWeight: '500' }}>
                       İyileştirme:
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>▲</span>
                         <span style={{ fontSize: '11px', color: '#495057' }}>Pozitif</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <span style={{ fontSize: '12px', color: '#d32f2f', fontWeight: 'bold' }}>▼</span>
                         <span style={{ fontSize: '11px', color: '#495057' }}>Negatif</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

              
              
            </div>
          )}
        </div>
      </div>

            {/* Global Filters Section */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Prod ID Filter */}
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px', display: 'block', fontWeight: '500' }}>
                    Prod ID
                  </label>
                  <div style={{ position: 'relative' }} className="dropdown-container">
                    <input
                      type="text"
                      placeholder="Ara..."
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        backgroundColor: '#fff'
                      }}
                      value={dropdownSearch.prodId || ''}
                      onChange={(e) => setDropdownSearch(prev => ({ ...prev, prodId: e.target.value }))}
                      onFocus={() => setOpenDropdown('prodId')}
                    />
                    {openDropdown === 'prodId' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <div
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: selectedProdId === 'Tümü' ? '#e3f2fd' : '#fff',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onClick={() => {
                            handleProdIdChange('Tümü');
                            setOpenDropdown(null);
                            setDropdownSearch(prev => ({ ...prev, prodId: '' }));
                          }}
                        >
                          Tümü
                        </div>
                        {Object.keys(processedData.productGroups)
                          .filter(product => 
                            normalizeText(product).includes(normalizeText(dropdownSearch.prodId))
                          )
                          .map(product => (
                            <div
                              key={product}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: selectedProdId === product ? '#e3f2fd' : '#fff',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                              onClick={() => {
                                handleProdIdChange(product);
                                setOpenDropdown(null);
                                setDropdownSearch(prev => ({ ...prev, prodId: product }));
                              }}
                            >
                              {product}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Option No Filter */}
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px', display: 'block', fontWeight: '500' }}>
                    Option No
                  </label>
                  <div style={{ position: 'relative' }} className="dropdown-container">
                    <input
                      type="text"
                      placeholder="Ara..."
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        backgroundColor: '#fff'
                      }}
                      value={dropdownSearch.optionNo || ''}
                      onChange={(e) => setDropdownSearch(prev => ({ ...prev, optionNo: e.target.value }))}
                      onFocus={() => setOpenDropdown('optionNo')}
                    />
                    {openDropdown === 'optionNo' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <div
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: selectedOptionNo === 'Tümü' ? '#e3f2fd' : '#fff',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onClick={() => {
                            handleOptionNoChange('Tümü');
                            setOpenDropdown(null);
                            setDropdownSearch(prev => ({ ...prev, optionNo: '' }));
                          }}
                        >
                          Tümü
                        </div>
                        {availableOptionNos
                          .filter(option => 
                            normalizeText(option).includes(normalizeText(dropdownSearch.optionNo))
                          )
                          .map(option => (
                            <div
                              key={option}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: selectedOptionNo === option ? '#e3f2fd' : '#fff',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                              onClick={() => {
                                handleOptionNoChange(option);
                                setOpenDropdown(null);
                                setDropdownSearch(prev => ({ ...prev, optionNo: option }));
                              }}
                            >
                              {option}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                                
                {/* Koli Filter */}
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px', display: 'block', fontWeight: '500' }}>
                    Koli
                  </label>
                  <div style={{ position: 'relative' }} className="dropdown-container">
                    <input
                      type="text"
                      placeholder="Ara..."
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        backgroundColor: '#fff'
                      }}
                      value={dropdownSearch.koli || ''}
                      onChange={(e) => setDropdownSearch(prev => ({ ...prev, koli: e.target.value }))}
                      onFocus={() => setOpenDropdown('koli')}
                    />
                    {openDropdown === 'koli' && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <div
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: selectedKoli === 'Tümü' ? '#e3f2fd' : '#fff',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onClick={() => {
                            handleKoliChange('Tümü');
                            setOpenDropdown(null);
                            setDropdownSearch(prev => ({ ...prev, koli: '' }));
                          }}
                        >
                          Tümü
                        </div>
                        {availableKolis
                          .filter(koli => 
                            normalizeText(koli).includes(normalizeText(dropdownSearch.koli))
                          )
                          .map(koli => (
                            <div
                              key={koli}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: selectedKoli === koli ? '#e3f2fd' : '#fff',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                              onClick={() => {
                                handleKoliChange(koli);
                                setOpenDropdown(null);
                                setDropdownSearch(prev => ({ ...prev, koli: koli }));
                              }}
                            >
                              {koli}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Reset Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={resetFilters}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#adb5bd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  Reset
                </button>
              </div>
            </div>



      {/* Default Combinations Info Card - Only show for new API responses */}
      {apiResponse && Object.keys(defaultCombinations).length > 0 && (
        <div style={{ 
          marginBottom: 24, 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#495057', fontSize: '16px', fontWeight: '600' }}>
            Varsayılan Kombinasyonlar 
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.entries(defaultCombinations).map(([productKey, info]) => (
              <div key={productKey} style={{ 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                border: '1px solid #e9ecef' 
              }}>
                <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
                  {productKey}
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Combination Key:</strong> {info.CombinationKey}</div>
                  <div><strong>Palet Efficiency:</strong> {info.PalletEfficiency.toFixed(2)}%</div>
                  <div><strong>Koli Efficiency:</strong> {info.CartonEfficiency.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      

      {/* Product Accordions */}
      {Object.keys(filteredProductGroups).length === 0 ? (
        <div style={{ 
          padding: '40px', 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#6c757d', fontSize: '18px', fontWeight: '500' }}>
            {apiResponse ? 'Henüz kombinasyon verisi yüklenmedi.' : 'Henüz sonuç verisi yüklenmedi.'}
          </h4>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
            {apiResponse ? 'Lütfen kombinasyon hesaplaması yapın.' : 'Lütfen bir sonuç dosyası yükleyin.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(filteredProductGroups).map(([productName, rows]) => (
          <div key={productName} style={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: '8px', 
            backgroundColor: '#f8f9fa',
            overflow: 'hidden'
          }}>
            {/* Product Header */}
            <div 
              onClick={() => toggleProductExpansion(productName)}
                  style={{
                padding: '16px', 
                cursor: 'pointer', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#e3f2fd',
                borderBottom: expandedProducts.has(productName) ? '1px solid #e0e0e0' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '16px' }}>{productName}</span>
                <span style={{ 
                  backgroundColor: '#1976d2', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  {rows.length} kombinasyon
                </span>
              </div>
              <div style={{ 
                transform: expandedProducts.has(productName) ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}>
                ▼
              </div>
            </div>

            {/* Product Content */}
            {expandedProducts.has(productName) && (
              <ProductDetail
                productName={productName}
                rows={rows}
                headers={processedData.headers}
                isDefaultCombo={isDefaultCombo}
                apiResponse={apiResponse}
                defaultCombinations={defaultCombinations}
                unitCosts={unitCosts}
                includeOrderData={includeOrderData}
                scenarioName={scenarioName}
                scenarioId={scenarioId}
                navigate={navigate}
              />
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default Result; 
