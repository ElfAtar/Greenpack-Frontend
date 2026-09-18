import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import type { CombinationResponse } from '../types/api';
import type { DefaultValues } from '../types';
import { ScenarioService } from '../services/scenarioService';
import api from '../services/api';
import { buildApiUrl } from '../utils/api';
import { useToast } from '../components/ToastContainer';
import SearchableSelect, { type SearchableSelectOption } from '../components/SearchableSelect';

// A long analysis can outlive its own HTTP connection: gateways and browsers cut idle requests
// after a few minutes while the server keeps calculating and stores the scenario afterwards.
// These control how long the screen waits for that scenario instead of reporting a failure.
const RUN_POLL_INTERVAL_MS = 8000;
const RUN_POLL_TIMEOUT_MS = 45 * 60 * 1000;
const RUN_LIST_FALLBACK_EVERY = 4;

type RunPhase = 'idle' | 'running' | 'reconnecting';

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * A dropped connection does not mean the run failed - the server keeps working and the scenario
 * turns up minutes later. Only a real HTTP answer from the API tells us something actually broke.
 */
const isConnectionDrop = (error: any): boolean => {
  if (!error) return false;
  if (error.code === 'ERR_CANCELED') return false;
  if (!error.response) return true;
  return [408, 502, 503, 504].includes(error.response.status);
};

/** Id generated up front so the run can be found again if its response never arrives. */
const createScenarioId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // randomUUID is missing on plain http:// origins and older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

const formatElapsed = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} dk ${String(seconds).padStart(2, '0')} sn`;
};

const Run: React.FC = () => {
  const { showSuccess, showError, ToastContainer } = useToast();
  const [mode, setMode] = useState<'upload' | 'local'>('local');
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState('');
  const [productKey, setProductKey] = useState('');
  const [runPhase, setRunPhase] = useState<RunPhase>('idle');
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runElapsedSeconds, setRunElapsedSeconds] = useState(0);
  const loading = runPhase !== 'idle';
  // Set when the user chooses to stop waiting, so a late result cannot yank them off the page
  // they moved to.
  const runAbandonedRef = useRef(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [productMode, setProductMode] = useState<'specific' | 'all' | 'group'>('specific');
  const [minBoxUtil, setMinBoxUtil] = useState('');
  const [minBoxUtilExpanded, setMinBoxUtilExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioWarning, setScenarioWarning] = useState('');
  const [productList, setProductList] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any>(null);
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [sameBoxCount, setSameBoxCount] = useState<'same' | 'different'>('same');
  
  // Cartoning method
  const [cartoningMethods, setCartoningMethods] = useState<string[]>(['machine']);
  const [cartoningMethodError, setCartoningMethodError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [defaultValues, setDefaultValues] = useState<DefaultValues | null>(null);
  const [showDefaultValuesModal, setShowDefaultValuesModal] = useState(false);
  const [runDefaultValues, setRunDefaultValues] = useState<DefaultValues | null>(null);
  const [updatingRunDefaults, setUpdatingRunDefaults] = useState(false);
  
  // Order data fields
  const [includeOrderData, setIncludeOrderData] = useState<'evet' | 'hayir'>('hayir');
  const [totalBoxCount, setTotalBoxCount] = useState('');
  const [percentageDistribution, setPercentageDistribution] = useState<Array<{percentage: string, boxCount: string}>>([{percentage: '', boxCount: ''}]);

  const navigate = useNavigate();

  // Fetch default values on component mount
  useEffect(() => {
    const fetchDefaultValues = async () => {
      try {
        const values = await ScenarioService.getDefaultValues();
        setDefaultValues(values);
        console.log('Default values loaded successfully:', values);
      } catch (error) {
        console.error('Failed to fetch default values:', error);
        showError('Varsayılan değerler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
      }
    };
    fetchDefaultValues();
  }, []);

  // Reset runDefaultValues whenever defaultValues changes (including on page refresh)
  useEffect(() => {
    if (defaultValues) {
      setRunDefaultValues(defaultValues);
    }
  }, [defaultValues]);

  // Navigation is handled directly in handleRun function when API response is received

  useEffect(() => {
    if (productMode === 'specific') {
      api.get('products/all')
        .then(res => {
          const data = res.data;
          if (Array.isArray(data)) setProductList(data);
          else if (data && Array.isArray(data.products)) setProductList(data.products);
        })
        .catch(() => setProductList([]));
    } else if (productMode === 'group') {
      api.get('productgroups/all')
        .then(res => {
          const data = res.data;
          if (Array.isArray(data)) setProductGroups(data);
          else setProductGroups([]);
        })
        .catch(() => setProductGroups([]));
    }
  }, [productMode]);

  // Keeps the "how long has this been going" readout ticking while a run is in flight.
  useEffect(() => {
    if (runPhase === 'idle' || runStartedAt === null) return;
    const tick = () => setRunElapsedSeconds(Math.floor((Date.now() - runStartedAt) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [runPhase, runStartedAt]);

  // Closing the tab mid-run loses the automatic redirect to the results, so warn first.
  useEffect(() => {
    if (runPhase === 'idle') return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [runPhase]);

  // Many products share almost the same name and differ only by form, so every row also carries
  // the product key and SAP code - that is what tells them apart while searching.
  const productOptions = useMemo<SearchableSelectOption[]>(() => (
    productList.map(product => {
      const key = String(product?.productKey ?? '');
      const sapCode = String(product?.sapCode ?? '');
      return {
        value: key,
        label: String(product?.productName ?? '') || key,
        sublabel: [key, sapCode !== '' ? `SAP: ${sapCode}` : ''].filter(Boolean).join('  •  '),
        meta: String(product?.type ?? '') || undefined,
        keywords: [product?.boxKey, product?.cartonKey, product?.cartoningMethod],
      };
    })
  ), [productList]);

  // Searching a group by one of the products inside it is usually how people remember it.
  const groupOptions = useMemo<SearchableSelectOption[]>(() => (
    productGroups.map(group => {
      const groupName = String(group?.groupName ?? '');
      const productKeys: string[] = Array.isArray(group?.productKeys) ? group.productKeys.map(String) : [];
      return {
        value: groupName,
        label: groupName,
        sublabel: `${productKeys.length} ürün  •  ${String(group?.user ?? '')}`,
        keywords: productKeys,
      };
    })
  ), [productGroups]);

  const scenarioIdsSnapshot = async (): Promise<Set<string>> => {
    try {
      const response = await api.get('scenarios');
      const scenarios = Array.isArray(response.data) ? response.data : [];
      return new Set<string>(scenarios.map((scenario: any) => String(scenario?.scenarioId ?? '')));
    } catch {
      return new Set<string>();
    }
  };

  /**
   * Looks for the finished run in the scenario list. The id we sent with the request is the exact
   * match; a freshly created scenario with the same name is the fallback for a backend that does
   * not echo that id back.
   */
  const findFinishedScenario = async (
    scenarioId: string,
    sanitizedName: string,
    knownScenarioIds: Set<string>
  ): Promise<string | null> => {
    try {
      const response = await api.get('scenarios');
      const scenarios = Array.isArray(response.data) ? response.data : [];

      if (scenarios.some((scenario: any) => scenario?.scenarioId === scenarioId)) return scenarioId;

      const created = scenarios
        .filter((scenario: any) =>
          scenario?.scenarioName === sanitizedName &&
          !knownScenarioIds.has(String(scenario?.scenarioId ?? '')))
        .sort((a: any, b: any) =>
          new Date(b?.runDateTime ?? 0).getTime() - new Date(a?.runDateTime ?? 0).getTime());

      return created.length > 0 ? String(created[0].scenarioId) : null;
    } catch {
      return null;
    }
  };

  /** Waits for the run the server is still working on, and returns its scenario id once it lands. */
  const waitForScenarioAfterDrop = async (
    scenarioId: string,
    sanitizedName: string,
    knownScenarioIds: Set<string>
  ): Promise<string | null> => {
    setRunPhase('reconnecting');
    const deadline = Date.now() + RUN_POLL_TIMEOUT_MS;
    let attempt = 0;

    while (Date.now() < deadline) {
      await delay(RUN_POLL_INTERVAL_MS);
      if (runAbandonedRef.current) return null;
      attempt++;

      try {
        const response = await api.get(`scenarios/${encodeURIComponent(scenarioId)}/status`);
        if (response.data?.exists) return scenarioId;
      } catch {
        // Status endpoint not reachable (or not deployed yet); the list check below still covers us.
      }

      if (attempt % RUN_LIST_FALLBACK_EVERY === 0) {
        const found = await findFinishedScenario(scenarioId, sanitizedName, knownScenarioIds);
        if (found) return found;
      }
    }

    return runAbandonedRef.current
      ? null
      : findFinishedScenario(scenarioId, sanitizedName, knownScenarioIds);
  };

  /** Lets the user carry on elsewhere; the run keeps going and lands in the scenario list. */
  const stopWaitingForRun = () => {
    runAbandonedRef.current = true;
    setRunPhase('idle');
    showSuccess('Analiz arka planda devam ediyor. Tamamlandığında Senaryolar listesinde görünecek.');
    navigate('/scenario');
  };

  // Validation logic is handled in handleRun function

  // Cartoning method validation - only for specific product mode
  useEffect(() => {
    if (productMode === 'specific' && cartoningMethods.length === 0) {
      setCartoningMethodError('En az bir kolileme yöntemi seçilmelidir.');
    } else {
      setCartoningMethodError('');
    }
  }, [cartoningMethods, productMode]);

  // Helper functions for validation styling
  const hasError = (fieldName: string) => {
    return showValidationErrors && validationErrors[fieldName];
  };

  // Helper function to sanitize scenario name for file operations
  const sanitizeScenarioName = (name: string) => {
    return name.trim().replace(/\s+/g, '_');
  };

     const getInputStyle = (fieldName: string) => {
     const baseStyle = { fontSize: 15, padding: '10px 12px', width: '300px' };
     if (hasError(fieldName)) {
       return { ...baseStyle, border: '2px solid #d32f2f', backgroundColor: '#fff5f5' };
     }
     return baseStyle;
   };

  // Clear validation error when user starts typing
  const clearValidationError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMode(e.target.value as 'upload' | 'local');
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleReset = () => {
    setMode('local');
    setFile(null);
    setOptions('');
    setProductKey('');
    setSelectedGroup('');
    setSelectedGroupDetails(null);
    setCurrentPage(1);
    setSameBoxCount('same');
    setResult(null);
    setError(null);
    setCartoningMethods(['machine']);
    setCartoningMethodError('');
    setValidationErrors({});
    setShowValidationErrors(false);
    setIncludeOrderData('hayir');
    setTotalBoxCount('');
    setPercentageDistribution([{percentage: '', boxCount: ''}]);
    setNotes('');
  };

  const handleProductModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductMode(e.target.value as 'specific' | 'all' | 'group');
    if (e.target.value === 'all' || e.target.value === 'group') setProductKey('');
    if (e.target.value !== 'group') {
      setSelectedGroup('');
      setSelectedGroupDetails(null);
      setCurrentPage(1);
      setSameBoxCount('same');
    }
  };

  const fetchGroupDetails = async (groupName: string) => {
    setGroupDetailsLoading(true);
    try {
      const response = await api.get(`productgroups/details/${encodeURIComponent(groupName)}`);
      setSelectedGroupDetails(response.data);
    } catch (error) {
      console.error('Error fetching group details:', error);
      setSelectedGroupDetails(null);
    } finally {
      setGroupDetailsLoading(false);
    }
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setScenarioWarning('');
    setShowValidationErrors(true);
    
    // Validate mandatory fields
    const errors: {[key: string]: string} = {};
    
    if (scenarioName.trim() === '') {
      errors.scenarioName = 'Lütfen bir senaryo adı giriniz.';
    }
    
    if (!includeOrderData) {
      errors.includeOrderData = 'Sipariş verisi dahil edilecek mi seçimi zorunludur.';
    }
    
    if (includeOrderData === 'evet') {
      if (totalBoxCount.trim() === '') {
        errors.totalBoxCount = 'Toplam kutu sayısı zorunludur.';
      }
      
      // Validate percentage distribution
      let totalPercentage = 0;
      let hasEmptyFields = false;
      
      percentageDistribution.forEach((row, _index) => {
        if (row.percentage.trim() === '' || row.boxCount.trim() === '') {
          hasEmptyFields = true;
        } else {
          totalPercentage += parseFloat(row.percentage) || 0;
        }
      });
      
      if (hasEmptyFields) {
        errors.percentageDistribution = 'Tüm yüzde dağılım alanları doldurulmalıdır.';
      } else if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.percentageDistribution = 'Yüzde dağılımların toplamı %100 olmalıdır. (Mevcut: %' + totalPercentage.toFixed(2) + ')';
      }
    }
    
    if (options.trim() === '') {
      errors.options = 'Kombinasyon Sayısı alanı zorunludur.';
    }
    
    if (!productMode) {
      errors.productMode = 'Kombinasyon üretim modu seçimi zorunludur.';
    }
    
    if (!mode) {
      errors.mode = 'Veri kaynağı seçimi zorunludur.';
    }
    
    if (productMode === 'specific' && productKey.trim() === '') {
      errors.productKey = 'Ürün seçimi zorunludur.';
    }
    
    if (productMode === 'group' && selectedGroup.trim() === '') {
      errors.selectedGroup = 'Grup seçimi zorunludur.';
    }
    
    if (productMode === 'specific' && cartoningMethods.length === 0) {
      errors.cartoningMethods = 'En az bir kolileme yöntemi seçilmelidir.';
    }
    
    if (mode === 'upload' && !file) {
      errors.file = 'Dosya seçimi zorunludur.';
    }
    
    setValidationErrors(errors);
    
    // If there are validation errors, don't proceed
    if (Object.keys(errors).length > 0) {
      return;
    }
    const sanitizedScenarioName = sanitizeScenarioName(scenarioName);
    // Generated here so the run stays identifiable even if its response never comes back.
    const runScenarioId = createScenarioId();

    runAbandonedRef.current = false;
    setRunPhase('running');
    setRunStartedAt(Date.now());
    setRunElapsedSeconds(0);
    setResult(null);
    setError(null);
    // Highlight data belongs to a single run; leftovers from an earlier one must not show up here.
    localStorage.removeItem('defaultCombinations');

    // Snapshot of what already exists, so a run recovered by name can be told from an older one.
    const knownScenarioIds = await scenarioIdsSnapshot();

    // Only a connection lost *after* the analysis was handed to the server is worth waiting out;
    // losing it while loading master data means nothing was started.
    let analysisStarted = false;

    try {
      // Step 1: Load data (local or upload)
      let data;
      if (mode === 'upload') {
        if (!file) {
          const errorMessage = 'Please select an Excel file to upload.';
          setError(errorMessage);
          showError(errorMessage);
          setRunPhase('idle');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('upload/master-data', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        data = response.data;
      } else {
        const response = await api.post('upload/load-local-data');
        data = response.data;
      }
      
      console.log('Data loading response:', data);
      analysisStarted = true;
      
      // Step 2: Call the appropriate generate endpoint based on productMode
      let genResponse;
      const minBoxUtilNumber = parseFloat(minBoxUtil);
      const optionCount = parseInt(options);
      
      // Prepare order data if included
      let orderItems = null;
      if (includeOrderData === 'evet' && totalBoxCount && percentageDistribution.length > 0) {
        orderItems = percentageDistribution
          .filter(row => row.percentage.trim() !== '' && row.boxCount.trim() !== '')
          .map(row => ({
            percentage: parseFloat(row.percentage),
            count: parseInt(row.boxCount)
          }));
      }
      
      const activeDefaultValues = defaultValues;

      if (productMode === 'specific') {
        // Use generate-and-save-products endpoint
        const requestBody = {
          scenarioId: runScenarioId,
          productKeys: [productKey],
          scenarioName: sanitizedScenarioName,
          optionCount: optionCount,
          minBoxUtil: !isNaN(minBoxUtilNumber) && minBoxUtil !== '' ? minBoxUtilNumber : null,
          cartoningMethods: cartoningMethods,
          includeOrderData: includeOrderData === 'evet',
          totalBoxCount: includeOrderData === 'evet' ? parseInt(totalBoxCount) : null,
          orderItems: orderItems,
          notes: notes,
          defaultValues: activeDefaultValues
        };
        
        console.log('Sending request to generate-and-save-products:', requestBody);
        genResponse = await api.post('combinations/generate-and-save-products', requestBody);
        console.log('Response status:', genResponse.status, genResponse.statusText);
        
      } else if (productMode === 'group') {
        // Get the selected group's product keys
        const selectedGroupData = productGroups.find(g => g.groupName === selectedGroup);
        const productKeys = selectedGroupData?.productKeys || [];
        
        // Use generate-group-save-with-cartoning endpoint
        const requestBody = {
          scenarioId: runScenarioId,
          productKeys: productKeys,
          groupName: selectedGroup, // Add the group name to the request
          scenarioName: sanitizedScenarioName,
          optionCount: optionCount,
          minBoxUtil: !isNaN(minBoxUtilNumber) && minBoxUtil !== '' ? minBoxUtilNumber : null,
          includeOrderData: includeOrderData === 'evet',
          totalBoxCount: includeOrderData === 'evet' ? parseInt(totalBoxCount) : null,
          orderItems: orderItems,
          notes: notes,
          defaultValues: activeDefaultValues
        };
        
        console.log('Sending request to generate-group-save-with-cartoning:', requestBody);
        genResponse = await api.post('combinations/generate-group-save-with-cartoning', requestBody);
        console.log('Response status:', genResponse.status, genResponse.statusText);
        
      } else {
        // Use generate-and-save-with-cartoning endpoint for all products
        const requestBody = {
          scenarioId: runScenarioId,
          scenarioName: sanitizedScenarioName,
          optionCount: optionCount,
          minBoxUtil: !isNaN(minBoxUtilNumber) && minBoxUtil !== '' ? minBoxUtilNumber : null,
          includeOrderData: includeOrderData === 'evet',
          totalBoxCount: includeOrderData === 'evet' ? parseInt(totalBoxCount) : null,
          orderItems: orderItems,
          notes: notes,
          defaultValues: activeDefaultValues
        };
        
        console.log('Sending request to generate-and-save-with-cartoning:', requestBody);
        genResponse = await api.post('combinations/generate-and-save-with-cartoning', requestBody);
        console.log('Response status:', genResponse.status, genResponse.statusText);
      }
      
      const genData = genResponse.data;
      console.log('Parsed response data:', genData);
      
      // Store default combinations for highlighting in results
      const defaultCombinations = (genData as any).defaultCombinations || (genData as any).DefaultCombinations || genData.DefaultCombos;
      if (defaultCombinations && Object.keys(defaultCombinations).length > 0) {
        console.log('Received default combinations:', defaultCombinations);
        localStorage.setItem('defaultCombinations', JSON.stringify(defaultCombinations));
      } else {
        console.log('No default combinations received in response');
        localStorage.removeItem('defaultCombinations');
      }
      
      // Navigate to Result page using scenario ID from database
      const scenarioId = (genData as any).scenarioId || (genData as any).ScenarioId;
      console.log('Scenario ID from API response:', scenarioId);
      console.log('Full genData response:', genData);
      
      if (scenarioId) {
        try {
          // Store for recalculation functionality
          localStorage.setItem('lastResultProductKey', productKey);
          
          // Navigate to Result page with the scenario ID as query parameter
          // The Result page will then call /api/scenarios/{scenarioId}/formatted-results
          const resultUrl = `/result?scenarioId=${encodeURIComponent(scenarioId)}`;
          console.log('Navigating to Result page with URL:', resultUrl);
          navigate(resultUrl);

          return;
        } catch (err: any) {
          console.error('Error navigating to result page:', err);
          const errorMessage = err.message || 'An error occurred.';
          setError(errorMessage);
          showError(errorMessage);
          setRunPhase('idle');
          return;
        }
      }
      
      // Fallback: try the old file-based approach if scenario ID is not available
      const filePathRaw = (genData as any).filePath || (genData as any).FilePath || genData.File || genData.file?.filePath;
      console.log('No scenario ID found, trying file path fallback:', filePathRaw);
      
      if (filePathRaw) {
        try {
          // Extract filename from the file path, handling both forward and backward slashes
          // (e.g., "results/scenarioName_timestamp.txt" or "results\scenarioName_timestamp.txt" -> "scenarioName_timestamp.txt")
          const filename = filePathRaw.split(/[/\\]/).pop() || filePathRaw;
          console.log('Extracted filename:', filename);
          
          // Store for recalculation functionality
          localStorage.setItem('lastResultProductKey', productKey);
          
          // Navigate to Result page with the filename as query parameter
          // The Result page will then call /api/combinations/result/{filename}.xlsx
          const resultUrl = `/result?file=${encodeURIComponent(filename)}`;
          console.log('Navigating to Result page with URL:', resultUrl);
          navigate(resultUrl);

          return;
        } catch (err: any) {
          console.error('Error navigating to result page:', err);
          const errorMessage = err.message || 'An error occurred.';
          setError(errorMessage);
          showError(errorMessage);
          setRunPhase('idle');
          return;
        }
      } else {
        console.warn('No scenarioId or filePath found in API response');
      }
      
      // If we reach here without a file, show the result data
      setResult(genData);
      setRunPhase('idle');
    } catch (err: any) {
      if (analysisStarted && isConnectionDrop(err)) {
        // The connection died, not the analysis: the server finishes the run and stores the
        // scenario regardless. Reporting a system error here is what made people cancel a run
        // that was actually working, so wait for the scenario instead.
        console.warn('Connection to the API dropped during the run, waiting for the scenario:', err);
        const recoveredScenarioId = await waitForScenarioAfterDrop(
          runScenarioId,
          sanitizedScenarioName,
          knownScenarioIds
        );

        if (runAbandonedRef.current) return;

        if (recoveredScenarioId) {
          localStorage.setItem('lastResultProductKey', productKey);
          setRunPhase('idle');
          navigate(`/result?scenarioId=${encodeURIComponent(recoveredScenarioId)}`);
          return;
        }

        const waitedMessage =
          'Analiz beklenenden uzun sürüyor. Sunucuda çalışmaya devam ediyor olabilir; ' +
          'sonucu birkaç dakika içinde "Senaryolar" sayfasından açabilirsiniz.';
        setError(waitedMessage);
        showError(waitedMessage);
        setRunPhase('idle');
        return;
      }

      // Prefer the backend's message (e.g. Turkish validation messages) over the generic
      // axios "Request failed with status code 400".
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.Message ||
        err.message ||
        'Bir hata oluştu.';
      setError(errorMessage);
      showError(errorMessage);
      setRunPhase('idle');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="main-content">
      <ToastContainer />
      <h2>Senaryo Oluştur</h2>
      <div style={{ 
        display: 'flex', 
        gap: 32, 
        margin: '40px auto', 
        maxWidth: 1200, 
        minWidth: 800,
        alignItems: 'flex-start'
      }}>
        {/* Left Column - Form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <form className="run-form" onSubmit={handleRun} style={{ 
            padding: 32, 
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)', 
            borderRadius: 12, 
            background: '#fff',
            width: '100%'
          }}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">
            Veri Kaynağı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
          </label>
          <div>
            <label>
              <input
                type="radio"
                value="local"
                checked={mode === 'local'}
                onChange={(e) => {
                  handleModeChange(e);
                  clearValidationError('mode');
                }}
              />{' '}
              Varolan Verileri Kullan
            </label>
            <label style={{ marginLeft: 24 }}>
              <input
                type="radio"
                value="upload"
                checked={mode === 'upload'}
                onChange={(e) => {
                  handleModeChange(e);
                  clearValidationError('mode');
                }}
              />{' '}
              Yeni Excel Dosyası Yükle
            </label>
          </div>
          {hasError('mode') && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.mode}</div>
          )}
        </div>
        {mode === 'upload' && (
          <div
            className="form-group"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: hasError('file') ? '2px dashed #d32f2f' : dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
              borderRadius: 8,
              padding: 16,
              background: hasError('file') ? '#fff5f5' : dragActive ? '#e3f2fd' : '#fafafa',
              transition: 'background 0.2s, border 0.2s',
              marginBottom: 16,
              position: 'relative'
            }}
          >
            {/* Template Download Button in upper right corner */}
            <button
              type="button"
              onClick={() => {
                const link = document.createElement('a');
                link.href = buildApiUrl('upload/download-template');
                link.download = 'DataTemplateGuncel.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: '4px 8px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                zIndex: 10
              }}
              title="Excel şablon dosyasını indirin - Ürün, kutu ve koli verilerinizi doğru formatta hazırlamak için kullanın"
            >
              <span>⬇️</span>
              Şablon
            </button>

            <label className="form-label">
              Excel Dosyası (.xlsx): <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                handleFileChange(e);
                clearValidationError('file');
              }}
              className="form-input"
              style={{ marginTop: 8, fontSize: 18, padding: '10px 12px' }}
            />
            <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
              Dosyanızı buraya sürükleyip bırakabilirsiniz veya tıklayarak seçin.
            </div>
            {file && (
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                Seçili: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
            {hasError('file') && (
              <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.file}</div>
            )}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">
            Senaryo Adı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={scenarioName}
            onChange={e => {
              setScenarioName(e.target.value);
              clearValidationError('scenarioName');
            }}
            required
            style={getInputStyle('scenarioName')}
            placeholder="Senaryo adını giriniz"
          />
          {hasError('scenarioName') && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.scenarioName}</div>
          )}
                     {scenarioWarning && !hasError('scenarioName') && (
             <div style={{ color: '#b00020', fontSize: 13, marginTop: 4 }}>{scenarioWarning}</div>
           )}
         </div>
         
         {/* Order Data Inclusion */}
         <div className="form-group">
           <label className="form-label">
             Sipariş Verisi Dahil Edilecek mi? <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
           </label>
           <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
             <label>
               <input
                 type="radio"
                 value="evet"
                 checked={includeOrderData === 'evet'}
                 onChange={(e) => {
                   setIncludeOrderData(e.target.value as 'evet' | 'hayir');
                   clearValidationError('includeOrderData');
                 }}
               />{' '}
               Evet
             </label>
             <label>
               <input
                 type="radio"
                 value="hayir"
                 checked={includeOrderData === 'hayir'}
                 onChange={(e) => {
                   setIncludeOrderData(e.target.value as 'evet' | 'hayir');
                   clearValidationError('includeOrderData');
                 }}
               />{' '}
               Hayır
             </label>
           </div>
           {hasError('includeOrderData') && (
             <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.includeOrderData}</div>
           )}
         </div>
         
         {/* Conditional Order Data Fields */}
         {includeOrderData === 'evet' && (
           <>
             <div className="form-group">
               <label className="form-label">
                 Toplam Kutu Sayısı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
               </label>
               <input
                 type="number"
                 className="form-input"
                 value={totalBoxCount}
                 onChange={e => {
                   setTotalBoxCount(e.target.value);
                   clearValidationError('totalBoxCount');
                 }}
                 required
                 min={1}
                 style={getInputStyle('totalBoxCount')}
                 placeholder="Toplam kutu sayısını giriniz"
               />
               {hasError('totalBoxCount') && (
                 <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.totalBoxCount}</div>
               )}
             </div>
             
             <div className="form-group">
               <label className="form-label">
                 Yüzde Dağılım, Kutu Sayısı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
               </label>
                               <div style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '6px', 
                  overflow: 'hidden',
                  marginTop: '8px',
                  display: 'inline-block',
                  width: 'fit-content'
                }}>
                                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ backgroundColor: '#f5f5f5' }}>
                       <th style={{ 
                         padding: '10px', 
                         textAlign: 'left', 
                         borderBottom: '1px solid #ddd',
                         fontWeight: '600',
                         color: '#333'
                       }}>
                         Yüzde Dağılım (%)
                       </th>
                       <th style={{ 
                         padding: '12px', 
                         textAlign: 'left', 
                         borderBottom: '1px solid #ddd',
                         fontWeight: '600',
                         color: '#333',
                         width: '20px'
                       }}>
                         Kutu Sayısı
                       </th>
                       <th style={{ 
                         padding: '12px', 
                         textAlign: 'center', 
                         borderBottom: '1px solid #ddd',
                         width: '20px'
                       }}>
                         
                       </th>
                     </tr>
                   </thead>
                   <tbody>
                     {percentageDistribution.map((row, index) => (
                       <tr key={index} style={{ borderBottom: index < percentageDistribution.length - 1 ? '1px solid #eee' : 'none' }}>
                                                   <td style={{ padding: '12px', borderRight: '1px solid #eee', position: 'relative' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={row.percentage}
                              onChange={(e) => {
                                const newDistribution = [...percentageDistribution];
                                newDistribution[index].percentage = e.target.value;
                                setPercentageDistribution(newDistribution);
                                clearValidationError('percentageDistribution');
                              }}
                              style={{
                                width: '180px',
                                padding: '8px 8px 8px 24px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                              placeholder="0.00"
                            />
                            <span style={{
                              position: 'absolute',
                              left: '16px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#666',
                              fontSize: '14px',
                              pointerEvents: 'none'
                            }}>
                              %
                            </span>
                          </td>
                         <td style={{ padding: '12px' }}>
                           <input
                             type="number"
                             min="1"
                             value={row.boxCount}
                             onChange={(e) => {
                               const newDistribution = [...percentageDistribution];
                               newDistribution[index].boxCount = e.target.value;
                               setPercentageDistribution(newDistribution);
                               clearValidationError('percentageDistribution');
                             }}
                             style={{
                               width: '180px',
                               padding: '8px',
                               border: '1px solid #ddd',
                               borderRadius: '4px',
                               fontSize: '14px'
                             }}
                             placeholder="0"
                           />
                         </td>
                         <td style={{ padding: '8px', textAlign: 'center' }}>
                           {percentageDistribution.length > 1 && (
                             <button
                               type="button"
                               onClick={() => {
                                 const newDistribution = percentageDistribution.filter((_, i) => i !== index);
                                 setPercentageDistribution(newDistribution);
                               }}
                               style={{
                                 background: 'none',
                                 border: 'none',
                                 color: '#d32f2f',
                                 cursor: 'pointer',
                                 fontSize: '16px',
                                 padding: '4px',
                                 borderRadius: '4px',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 width: '24px',
                                 height: '24px'
                               }}
                               title="Bu satırı sil"
                             >
                               ✕
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 <div style={{ 
                   padding: '12px', 
                   borderTop: '1px solid #ddd',
                   backgroundColor: '#f9f9f9',
                   textAlign: 'center'
                 }}>
                   <button
                     type="button"
                     onClick={() => {
                       setPercentageDistribution([...percentageDistribution, {percentage: '', boxCount: ''}]);
                     }}
                     style={{
                       background: 'none',
                       border: '1px solid #1976d2',
                       color: '#1976d2',
                       cursor: 'pointer',
                       fontSize: '14px',
                       padding: '8px 16px',
                       borderRadius: '4px',
                       fontWeight: '500',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '4px',
                       margin: '0 auto'
                     }}
                   >
                     <span style={{ fontSize: '16px' }}>+</span>
                     Yeni Satır Ekle
                   </button>
                 </div>
               </div>
               {hasError('percentageDistribution') && (
                 <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.percentageDistribution}</div>
               )}
             </div>
           </>
         )}
        {/* Product Mode Selection */}
        <div className="form-group">
          <label className="form-label">
            Kombinasyon Üretim Modu: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
            <label>
              <input
                type="radio"
                value="specific"
                checked={productMode === 'specific'}
                onChange={(e) => {
                  handleProductModeChange(e);
                  clearValidationError('productMode');
                }}
              />{' '}
              Tek ürün
            </label>
            <label>
              <input
                type="radio"
                value="group"
                checked={productMode === 'group'}
                onChange={(e) => {
                  handleProductModeChange(e);
                  clearValidationError('productMode');
                }}
              />{' '}
              Ürün Grubu
            </label>
            <label>
              <input
                type="radio"
                value="all"
                checked={productMode === 'all'}
                onChange={(e) => {
                  handleProductModeChange(e);
                  clearValidationError('productMode');
                }}
              />{' '}
              Tüm ürünler
            </label>
          </div>
          {hasError('productMode') && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.productMode}</div>
          )}
        </div>
                 {/* Product Key Field (only if specific) */}
         {productMode === 'specific' && (
           <div className="form-group">
             <label className="form-label">
               Ürün Adı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
               <span style={{ marginLeft: 8, color: '#888', fontSize: 13, fontStyle: 'italic' }}>
                 (Ürün adı, ürün kodu veya SAP kodu ile arayabilirsiniz)
               </span>
             </label>
             <SearchableSelect
               options={productOptions}
               value={productKey}
               onChange={value => {
                 setProductKey(value);
                 clearValidationError('productKey');
               }}
               placeholder="Ürün ara veya seç..."
               emptyText="Aramanızla eşleşen ürün bulunamadı"
               noOptionsText="Ürün listesi yüklenemedi"
               hasError={Boolean(hasError('productKey'))}
               width={300}
             />
             {hasError('productKey') && (
               <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.productKey}</div>
             )}
           </div>
         )}
         
         {/* Product Group Field (only if group) */}
         {productMode === 'group' && (
           <div className="form-group">
             <label className="form-label">
               Grup Adı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
               <span style={{ marginLeft: 8, color: '#888', fontSize: 13, fontStyle: 'italic' }}>
                 (Grup adı veya içindeki ürün ile arayabilirsiniz)
               </span>
             </label>
             <SearchableSelect
               options={groupOptions}
               value={selectedGroup}
               onChange={groupName => {
                 setSelectedGroup(groupName);
                 clearValidationError('selectedGroup');
                 if (groupName) {
                   fetchGroupDetails(groupName);
                   setCurrentPage(1);
                 } else {
                   setSelectedGroupDetails(null);
                 }
               }}
               placeholder="Grup ara veya seç..."
               emptyText="Aramanızla eşleşen grup bulunamadı"
               noOptionsText="Tanımlı ürün grubu bulunmuyor"
               hasError={Boolean(hasError('selectedGroup'))}
               width={300}
             />
             {hasError('selectedGroup') && (
               <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.selectedGroup}</div>
             )}
           </div>
         )}

         {/* Group Details Display (only if group is selected) */}
         {productMode === 'group' && (selectedGroupDetails || groupDetailsLoading) && (
           <div className="form-group" style={{ 
             marginTop: 16, 
             padding: 16, 
             border: '1px solid #e0e0e0', 
             borderRadius: 8, 
             backgroundColor: '#f8f9fa' 
           }}>
             <h4 style={{ marginBottom: 16, color: '#333', fontSize: 16, fontWeight: 600 }}>
               📋 Grup Detayları: {groupDetailsLoading ? 'Yükleniyor...' : selectedGroupDetails.group.groupName}
             </h4>
             
             {groupDetailsLoading ? (
               <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                 <div style={{ fontSize: 16, marginBottom: 8 }}>⏳ Grup detayları yükleniyor...</div>
               </div>
             ) : (
               <>
                 <div style={{ marginBottom: 12 }}>
                   <strong>Grup Bilgileri:</strong>
                   <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                     • Oluşturan: {selectedGroupDetails.group.user} • Tarih: {new Date(selectedGroupDetails.group.createdAt).toLocaleDateString('tr-TR')} • Ürün: {selectedGroupDetails.group.productCount}
                   </div>
                 </div>

                 <div>
                   <strong>Ürün Listesi:</strong>
                   <div style={{ 
                     maxHeight: '300px', 
                     overflowY: 'auto', 
                     border: '1px solid #dee2e6', 
                     borderRadius: 6, 
                     backgroundColor: '#fff',
                     marginTop: 8
                   }}>
                     {selectedGroupDetails.products
                       .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                       .map((product: any, index: number) => (
                         <div key={index} style={{ 
                           padding: 12, 
                           borderBottom: index < itemsPerPage - 1 ? '1px solid #dee2e6' : 'none',
                           backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#fff'
                         }}>
                           <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4 }}>
                             {product.productName}
                           </div>
                           <div style={{ fontSize: 13, color: '#666' }}>
                             <strong>Kutu Boyutu:</strong> {product.boxSize}
                           </div>
                         </div>
                       ))}
                   </div>
                   
                   {/* Pagination */}
                   {selectedGroupDetails.products.length > itemsPerPage && (
                     <div style={{ 
                       display: 'flex', 
                       justifyContent: 'center', 
                       alignItems: 'center', 
                       gap: 8, 
                       marginTop: 12 
                     }}>
                       <button
                         type="button"
                         onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                         disabled={currentPage === 1}
                         style={{
                           padding: '6px 12px',
                           border: '1px solid #ccc',
                           borderRadius: 4,
                           backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                           cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                           fontSize: 12
                         }}
                       >
                         Önceki
                       </button>
                       <span style={{ fontSize: 13, color: '#666' }}>
                         Sayfa {currentPage} / {Math.ceil(selectedGroupDetails.products.length / itemsPerPage)}
                       </span>
                       <button
                         type="button"
                         onClick={() => setCurrentPage(prev => Math.min(Math.ceil(selectedGroupDetails.products.length / itemsPerPage), prev + 1))}
                         disabled={currentPage >= Math.ceil(selectedGroupDetails.products.length / itemsPerPage)}
                         style={{
                           padding: '6px 12px',
                           border: '1px solid #ccc',
                           borderRadius: 4,
                           backgroundColor: currentPage >= Math.ceil(selectedGroupDetails.products.length / itemsPerPage) ? '#f5f5f5' : '#fff',
                           cursor: currentPage >= Math.ceil(selectedGroupDetails.products.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                           fontSize: 12
                         }}
                       >
                         Sonraki
                       </button>
                     </div>
                   )}
                 </div>
               </>
             )}
           </div>
         )}

         {/* Box Count Options (only if group) */}
         {productMode === 'group' && (
           <div className="form-group">
             <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               Koli İçi Kutu Sayısı:
               <div style={{ display: 'flex', gap: 24 }}>
                 <label>
                   <input
                     type="radio"
                     value="same"
                     checked={sameBoxCount === 'same'}
                     onChange={e => setSameBoxCount(e.target.value as 'same' | 'different')}
                   />{' '}
                   Eşit
                 </label>
                 <label>
                   <input
                     type="radio"
                     value="different"
                     checked={sameBoxCount === 'different'}
                     onChange={e => setSameBoxCount(e.target.value as 'same' | 'different')}
                   />{' '}
                   Esnek
                 </label>
               </div>
             </label>
             {sameBoxCount === 'same' && (
               <div style={{ marginTop: 8, fontSize: 13, color: '#666', fontStyle: 'italic' }}>
                 *Her bir ürün için, ortak en iyi kolilere koli içi kutu sayısı eşit olacak şekilde yerleştirilecektir.
               </div>
             )}
             {sameBoxCount === 'different' && (
               <div style={{ marginTop: 8, fontSize: 13, color: '#666', fontStyle: 'italic' }}>
                 *Her bir ürün, maksimum verim alınan kolilere maksimum sayıda yerleştirilecektir.
               </div>
             )}
           </div>
         )}
      
        <div className="form-group">
          <label className="form-label">
            Kombinasyon Sayısı: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
            <span style={{ marginLeft: 8, color: '#888', fontSize: 13, fontStyle: 'italic' }}>
              (Hesaplanacak en iyi kombinasyon sayısı)
            </span>
          </label>
                      <input
              type="number"
              className="form-input"
              value={options}
              onChange={e => {
                setOptions(e.target.value);
                clearValidationError('options');
              }}
              required
              min={1}
              style={getInputStyle('options')}
            />
          {hasError('options') && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{validationErrors.options}</div>
          )}
        </div>
        {/* Cartoning Method Controls - Only show for specific product mode */}
        {productMode === 'specific' && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              Kolileme Yöntemi: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span>
              <div style={{ display: 'flex', gap: 24 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={cartoningMethods.includes('hand')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCartoningMethods([...cartoningMethods, 'hand']);
                      } else {
                        setCartoningMethods(cartoningMethods.filter(m => m !== 'hand'));
                      }
                      clearValidationError('cartoningMethods');
                    }}
                  />{' '}
                  El Ambalajı Kolileme
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={cartoningMethods.includes('machine')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCartoningMethods([...cartoningMethods, 'machine']);
                      } else {
                        setCartoningMethods(cartoningMethods.filter(m => m !== 'machine'));
                      }
                      clearValidationError('cartoningMethods');
                    }}
                  />{' '}
                  Makine ile kolileme
                </label>
              </div>
            </label>
            {(hasError('cartoningMethods') || cartoningMethodError) && (
              <div style={{ marginTop: 8, color: '#d32f2f', fontSize: 13 }}>
                {hasError('cartoningMethods') ? validationErrors.cartoningMethods : cartoningMethodError}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label
            className="form-label"
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }}
            onClick={() => setMinBoxUtilExpanded(exp => !exp)}
          >
            <span style={{ fontWeight: 500 }}>
              {minBoxUtilExpanded ? '▼' : '▶'} Minimum Koli Doluluk Oranı (%):
            </span>
            <span style={{ marginLeft: 8, color: '#888', fontSize: 13, fontStyle: 'italic' }}>
              (Opsiyonel - Minimum koli doluluk oranını belirtiniz.)
            </span>
          </label>
          {minBoxUtilExpanded && (
            <div style={{ position: 'relative', display: 'inline-block', width: 120 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#b0b0b0',
                  fontSize: 16,
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              >
                %
              </span>
              <input
                name="minBoxUtil"
                placeholder="Örn. 90.5"
                value={minBoxUtil}
                onChange={e => setMinBoxUtil(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 24,
                  paddingRight: 8,
                  fontSize: 15,
                  borderRadius: 6,
                  border: '1px solid #b0b0b0',
                  height: 36,
                  boxSizing: 'border-box'
                }}
                type="number"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          )}
                     {/* Notes Field */}
         <div className="form-group" style={{ marginTop: '16px' }}>
           <label
             className="form-label"
             style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }}
           >
             <span style={{ fontWeight: 500 }}>
               Notlar:
             </span>
             <span style={{ marginLeft: 8, color: '#888', fontSize: 13, fontStyle: 'italic' }}>
               (Opsiyonel - Bu run hakkında notlarınızı ekleyebilirsiniz)
             </span>
           </label>
          <textarea
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Bu run hakkında notlarınızı buraya yazabilirsiniz..."
            style={{
              width: '50%',
              minHeight: '20px',
              padding: '12px',
              fontSize: '15px',
              borderRadius: '6px',
              border: '1px solid #b0b0b0',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.4'
            }}
          />
        </div>
          <div style={{ 
            marginTop: 12, 
            padding: 12,
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: 6,
            fontSize: 13, 
            color: '#495057',
            lineHeight: 1.5,
            borderLeft: '3px solid #1976d2',
            fontWeight: 'bold'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 6,
              fontWeight: 500,
              color: '#1976d2'
            }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <span>Bilgi</span>
            </div>
            Kombinasyon çıktıları öncelikle palet verimliliğine, ardından koli verimliliğine göre sıralanarak istenen sayıda en iyi sonuçlar listelenecektir.
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center' }}>
          <button 
            type="submit" 
            className="btn-save" 
            disabled={loading} 
            style={{ 
              fontSize: 18, 
              padding: '10px 32px',
              backgroundColor: showValidationErrors && Object.keys(validationErrors).length > 0 ? '#d32f2f' : '#1976d2',
              border: showValidationErrors && Object.keys(validationErrors).length > 0 ? '2px solid #d32f2f' : 'none',
              color: '#fff',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Running...' : showValidationErrors && Object.keys(validationErrors).length > 0 ? '⚠️ Run (Hatalar Var)' : 'Run'}
          </button>
          <button type="button" className="btn-cancel" onClick={handleReset} disabled={loading} style={{ fontSize: 18, padding: '10px 32px' }}>
            Reset
          </button>
        </div>
      </form>
        </div>
        
                 {/* Right Column - Default Values Panel */}
         <div style={{ 
           width: 400, 
           padding: 24, 
           boxShadow: '0 2px 16px rgba(0,0,0,0.07)', 
           borderRadius: 12, 
           background: '#fff',
           position: 'sticky',
           top: 20
         }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20,
            borderBottom: '2px solid #e3f2fd',
            paddingBottom: 12
          }}>
            <h3 style={{ 
              color: '#1976d2', 
              fontSize: 18, 
              fontWeight: 600,
              margin: 0
            }}>
              ⚙️ Varsayılan Değerler
            </h3>
            <button
              onClick={() => {
                setRunDefaultValues(defaultValues);
                setShowDefaultValuesModal(true);
              }}
              style={{
                padding: '6px 6px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>✏️</span>
              Düzenle
            </button>
          </div>
          
          <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
            {defaultValues ? (
              <>
                                 <div style={{ marginBottom: 12 }}>
                   <strong style={{ color: '#1976d2' }}>📦 Kutu Sınırları:</strong>
                   <div style={{ marginLeft: 12, marginTop: 4 }}>
                     <div>• Bundledaki Maksimum Kutu Sayısı: {defaultValues.maxNumBoxesInABundle}</div>
                     <div>• Bundle Boyutlarindaki Maksimum Kutu Sayısı: {defaultValues.maxNumBoxesInAnyBundleDimension}</div>
                     <div>• Koli İçerisindeki Maksimum Kutu İstifi: {defaultValues.maxNumBoxesStackedInCarton}</div>
                   </div>
                 </div>
                 <div style={{ marginBottom: 12 }}>
                   <strong style={{ color: '#1976d2' }}>📏 Palet Sınırları:</strong>
                   <div style={{ marginLeft: 12, marginTop: 4 }}>
                     <div>• Palet Maksimum Overhang: {defaultValues.paletMaxOverhang} mm</div>
                     <div>• Palet Maksimum Underhang: {defaultValues.paletMaxUnderhang} mm</div>
                   </div>
                 </div>
                 <div style={{ marginBottom: 12 }}>
                   <strong style={{ color: '#1976d2' }}>🔧 El Kolileme Boşlukları:</strong>
                   <div style={{ marginLeft: 12, marginTop: 4 }}>
                     <div>• Genişlik Boşluğu: {defaultValues.handGapWidth} mm</div>
                     <div>• Kalınlık Boşluğu: {defaultValues.handGapThickness} mm</div>
                     <div>• Yükseklik Boşluğu: {defaultValues.handGapHeight} mm</div>
                   </div>
                 </div>
                                   <div style={{ marginBottom: 12 }}>
                    <strong style={{ color: '#1976d2' }}>🏭 Makine Kolileme Boşlukları:</strong>
                    <div style={{ marginLeft: 12, marginTop: 4 }}>
                      <div>• Genişlik Boşluğu: {defaultValues.machineGapWidth} mm</div>
                      <div>• Kalınlık Boşluğu: {defaultValues.machineGapThickness} mm</div>
                      <div>• Yükseklik Boşluğu: {defaultValues.machineGapHeight} mm</div>
                    </div>
                  </div>
                                     <div style={{ marginBottom: 12 }}>
                     <strong style={{ color: '#1976d2' }}>💰 Maliyet Parametreleri:</strong>
                     <div style={{ marginLeft: 12, marginTop: 4 }}>
                       <div>• Birim Koli Maliyeti: Koli çeşidine göre değişiklik gösterir</div>
                       <div>• Birim Palet Maliyeti: {defaultValues.unitPalletCost} ₺</div>
                       <div>• Elleçleme Maliyeti: {defaultValues.handlingCost} ₺</div>
                     </div>
                   </div>
              </>
            ) : (
              <div style={{ 
                padding: 16, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 8, 
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>⏳</div>
                <div>Varsayılan değerler yükleniyor...</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Validation Errors Summary - Outside the two-column layout */}
      {showValidationErrors && Object.keys(validationErrors).length > 0 && (
        <div style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#fff5f5',
          border: '2px solid #d32f2f',
          borderRadius: 8,
          color: '#d32f2f',
          fontWeight: 500,
          fontSize: 15
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <strong>Lütfen aşağıdaki zorunlu alanları doldurunuz:</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.values(validationErrors).map((error, index) => (
              <li key={index} style={{ marginBottom: 4 }}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="error-message" style={{ marginTop: 16, color: '#b00020', fontWeight: 500 }}>
          {error}
        </div>
      )}
      {result && (
        <div className="run-result" style={{ marginTop: 24 }}>
          <h3 style={{ color: '#2e7d32' }}>Success</h3>
          <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 4, overflowX: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          {result.File && (
            <a
              href={`/${result.File.replace(/\\/g, '/')}`}
              download
              style={{
                display: 'inline-block',
                marginTop: 12,
                padding: '8px 16px',
                background: '#1976d2',
                color: '#fff',
                borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              Download Result File
            </a>
          )}
        </div>
      )}
      {/* Run progress modal. A dropped connection is shown as "still running", not as an error,
          because the analysis keeps going on the server and this screen opens it automatically. */}
      {runPhase !== 'idle' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#fff',
            padding: '40px 48px',
            borderRadius: 16,
            boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
            maxWidth: 560,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 26,
              fontWeight: 600,
              color: runPhase === 'reconnecting' ? '#ef6c00' : '#1976d2',
              marginBottom: 12,
            }}>
              {runPhase === 'reconnecting' ? 'Analiz devam ediyor...' : 'Hesaplanıyor...'}
            </div>
            <div style={{ fontSize: 15, color: '#495057', lineHeight: 1.6 }}>
              {runPhase === 'reconnecting'
                ? 'Sunucu ile bağlantı koptu, ancak analiz sunucu tarafında çalışmaya devam ediyor. Sonuç hazır olduğunda bu ekran otomatik olarak sonuç sayfasına geçecektir.'
                : 'Seçilen ürün ve kombinasyon sayısına göre bu işlem birkaç dakika sürebilir.'}
            </div>
            <div style={{ marginTop: 18, fontSize: 14, color: '#6c757d' }}>
              Geçen süre: {formatElapsed(runElapsedSeconds)}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#6c757d' }}>
              Lütfen sayfayı kapatmayın veya yenilemeyin.
            </div>
            {runPhase === 'reconnecting' && (
              <button
                type="button"
                onClick={stopWaitingForRun}
                style={{
                  marginTop: 20,
                  padding: '8px 20px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: '1px solid #ef6c00',
                  background: '#fff',
                  color: '#ef6c00',
                  cursor: 'pointer',
                }}
              >
                Beklemeden Senaryolar sayfasına git
              </button>
            )}
          </div>
        </div>
      )}

      {/* Default Values Modal */}
      {showDefaultValuesModal && runDefaultValues && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '2px solid #e3f2fd',
              paddingBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1976d2',
                margin: 0
              }}>
                ⚙️ Run İçin Varsayılan Değerleri Düzenle
              </h2>
              <button
                onClick={() => setShowDefaultValuesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

                         <div style={{ marginBottom: '24px' }}>
               <p style={{
                 fontSize: '14px',
                 color: '#666',
                 margin: 0,
                 fontStyle: 'italic'
               }}>
                 Bu değişiklikler sadece bu run için geçerli olacaktır ve kalıcı olarak <u>kaydedilmeyecektir</u>.
               </p>
             </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Bundle Parameters */}
              <div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1976d2',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e3f2fd'
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
                      value={runDefaultValues.maxNumBoxesInABundle || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        maxNumBoxesInABundle: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                      value={runDefaultValues.maxNumBoxesInAnyBundleDimension || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        maxNumBoxesInAnyBundleDimension: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                      value={runDefaultValues.maxNumBoxesStackedInCarton || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        maxNumBoxesStackedInCarton: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e3f2fd'
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
                      value={runDefaultValues.paletMaxOverhang || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        paletMaxOverhang: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                      value={runDefaultValues.paletMaxUnderhang || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        paletMaxUnderhang: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e3f2fd'
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
                      value={runDefaultValues.unitPalletCost || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        unitPalletCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
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
                      value={runDefaultValues.handlingCost || ''}
                      onChange={(e) => setRunDefaultValues({
                        ...runDefaultValues,
                        handlingCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Gap Parameters Section */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#1976d2',
                marginBottom: '20px',
                paddingBottom: '8px',
                borderBottom: '2px solid #e3f2fd'
              }}>
                📦 Koli Boşluk Parametreleri
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                
                {/* Hand Gap Parameters */}
                <div>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#1976d2',
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #e3f2fd'
                  }}>
                    🤲 El Kolileme Boşlukları
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '14px'
                      }}>
                        Genişlik Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.handGapWidth || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          handGapWidth: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
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
                        Kalınlık Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.handGapThickness || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          handGapThickness: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
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
                        Yükseklik Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.handGapHeight || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          handGapHeight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
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
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #e3f2fd'
                  }}>
                    🏭 Makine Kolileme Boşlukları
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '14px'
                      }}>
                        Genişlik Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.machineGapWidth || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          machineGapWidth: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
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
                        Kalınlık Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.machineGapThickness || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          machineGapThickness: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
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
                        Yükseklik Boşluğu (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={runDefaultValues.machineGapHeight || ''}
                        onChange={(e) => setRunDefaultValues({
                          ...runDefaultValues,
                          machineGapHeight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '16px', 
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowDefaultValuesModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                İptal
              </button>
              <button
                onClick={() => {
                  try {
                    setUpdatingRunDefaults(true);
                    setDefaultValues(runDefaultValues);
                    setShowDefaultValuesModal(false);
                    // Show success message
                    showSuccess('Run için varsayılan değerler başarıyla güncellendi!');
                  } catch (error) {
                    console.error('Error updating run default values:', error);
                    showError('Varsayılan değerler güncellenirken hata oluştu!');
                  } finally {
                    setUpdatingRunDefaults(false);
                  }
                }}
                disabled={updatingRunDefaults}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: updatingRunDefaults ? 'not-allowed' : 'pointer',
                  opacity: updatingRunDefaults ? 0.6 : 1,
                  minWidth: '120px'
                }}
              >
                {updatingRunDefaults ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Run; 
