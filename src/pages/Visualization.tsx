import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import VisualizationWrapper from '../VisualizationWrapper';
import BoxViewThreeJS from '../components/BoxViewThreeJS';
import BundleViewThreeJS from '../components/BundleViewThreeJS';
import CartonViewThreeJS from '../components/CartonViewThreeJS';
import PalletViewThreeJS from '../components/PalletViewThreeJS';
import CombinationDetails from '../components/CombinationDetails';
import type { VisualizationDto } from '../types/visualization';

const Visualization: React.FC = () => {
  const location = useLocation();
  const [visualizationData, setVisualizationData] = useState<VisualizationDto | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDataLoaded = (data: VisualizationDto) => {
    setVisualizationData(data);
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Hide the download button temporarily
      const downloadButton = document.querySelector('[title="Download"]') as HTMLElement;
      if (downloadButton) {
        downloadButton.style.display = 'none';
      }

      // Capture the content as canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight
      });

      // Show the download button again
      if (downloadButton) {
        downloadButton.style.display = 'flex';
      }

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit the content
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      // Center the image on the page
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Generate filename with product name and timestamp
      const productName = getProductName().replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `Visualization_${productName}_${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Get product name from URL parameters
  const getProductName = () => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('productId');
    return productId || 'Product Visualization';
  };

  console.log('🔍 Visualization page - visualizationData:', visualizationData);
  console.log('🔍 Visualization page - bundle data:', visualizationData?.bundle);
  console.log('🔍 Visualization page - URL search:', location.search);
  console.log('🔍 Visualization page - URL params:', new URLSearchParams(location.search));

  return (
    <div ref={contentRef} className="main-content" style={{ paddingBottom: '40px' }}>
      {/* VisualizationWrapper to load data */}
      <VisualizationWrapper onDataLoaded={handleDataLoaded} />
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '24px',
        marginBottom: 24,
        padding: '0 16px'
      }}>
        <div style={{ flex: 1 }}></div>
        <h2 style={{ flex: 1, textAlign: 'center' }}>{getProductName()}</h2>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              color: '#333',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={handleDownloadPDF}
            title="Download"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
          </button>
        </div>
      </div>

      {/* Debug info */}
      {!visualizationData && (
        <div style={{ 
          padding: '16px', 
          margin: '16px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div>Loading visualization data...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            URL: {location.search}
          </div>
        </div>
      )}

      {/* 4-Part Visualization Layout */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gridTemplateRows: '1fr 1fr',
          gap: 1,
          height: 'calc(100vh - 200px)',
          minHeight: '700px',
          border: '1px solid #ddd',
          position: 'relative',
          zIndex: 0
        }}>
          {/* Left Upper - Box */}
          <div style={{ 
            background: '#fff', 
            padding: 8, 
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #ddd',
            borderBottom: '1px solid #ddd',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#333',
              textAlign: 'center',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '4px'
            }}>
              {visualizationData
                ? `Kutu (${visualizationData.box.width.toFixed(0)}x${visualizationData.box.thickness.toFixed(0)}x${visualizationData.box.height.toFixed(0)})`
                : 'Kutu'}
            </h3>
            <div style={{ 
              flex: 1,
              overflow: 'hidden',
              background: '#fafafa'
            }}>
              {visualizationData ? (
                <BoxViewThreeJS box={visualizationData.box} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📦</div>
                  <div>Loading box data...</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>BOX SECTION</div>
                </div>
              )}
            </div>
          </div>

            {/* Right Upper - Bundle */}
            <div style={{ 
              background: '#fff', 
              padding: 8, 
              display: 'flex',
              flexDirection: 'column',
              borderBottom: '1px solid #ddd',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#333',
                textAlign: 'center',
                borderBottom: '2px solid #dc2626',
                paddingBottom: '4px'
              }}>
                {visualizationData && visualizationData.bundle.bundleWidth
                  ? `Bundle (${visualizationData.bundle.bundleWidth?.toFixed(0) || 0}x${visualizationData.bundle.bundleThickness?.toFixed(0) || 0}x${visualizationData.bundle.bundleHeight?.toFixed(0) || 0})`
                  : 'Bundle'}
              </h3>
              <div style={{ 
                flex: 1,
                overflow: 'hidden',
                background: '#fafafa'
              }}>
                {visualizationData ? (
                  <BundleViewThreeJS bundle={visualizationData.bundle} box={visualizationData.box} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', flexDirection: 'column' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📚</div>
                    <div>Loading bundle data...</div>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>BUNDLE SECTION</div>
                  </div>
                )}
              </div>
            </div>

          {/* Left Bottom - Carton */}
          <div style={{ 
            background: '#fff', 
            padding: 8, 
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #ddd',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#333',
              textAlign: 'center',
              borderBottom: '2px solid #16a34a',
              paddingBottom: '4px'
            }}>
              {visualizationData
                ? `Koli (${visualizationData.carton.cartonHeight.toFixed(0)}x${visualizationData.carton.cartonThickness.toFixed(0)}x${visualizationData.carton.cartonWidth.toFixed(0)})`
                : 'Koli'}
            </h3>
            <div style={{ 
              flex: 1,
              overflow: 'hidden',
              background: '#fafafa'
            }}>
              {visualizationData ? (
                <CartonViewThreeJS
                  carton={visualizationData.carton}
                  box={visualizationData.box}
                  bundle={visualizationData.bundle}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
                  <div>Loading carton data...</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>CARTON SECTION</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Bottom - Pallet */}
          <div style={{ 
            background: '#fff', 
            padding: 8, 
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#333',
              textAlign: 'center',
              borderBottom: '2px solid #7c3aed',
              paddingBottom: '4px'
            }}>
              {visualizationData
                ? `Palet (${visualizationData.pallet.length.toFixed(0)}x${visualizationData.pallet.width.toFixed(0)}x130)`
                : 'Palet'}
            </h3>
            <div style={{ 
              flex: 1,
              overflow: 'hidden',
              background: '#fafafa'
            }}>
              {visualizationData ? (
                <PalletViewThreeJS pallet={visualizationData.pallet} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', flexDirection: 'column' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>🚛</div>
                  <div>Loading pallet data...</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>PALLET SECTION</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VisualizationWrapper onDataLoaded={handleDataLoaded} />

      {/* Visual Separator */}
      {visualizationData && (
        <div style={{
          height: '2px',
          backgroundColor: '#e9ecef',
          margin: '30px 16px',
          borderRadius: '1px'
        }} />
      )}

      {/* Combination Details Section - At the very end */}
      {visualizationData && (
        <div style={{ 
          padding: '0 16px', 
          marginTop: '60px',
          position: 'relative',
          zIndex: 10,
          clear: 'both'
        }}>
          <CombinationDetails data={visualizationData} />
        </div>
      )}
    </div>
  );
};

export default Visualization;
