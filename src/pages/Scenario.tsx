import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScenariosTable from '../components/ScenariosTable'
import type { Scenario } from '../components/ScenariosTable'
import { ScenarioService } from '../services/scenarioService'
import { useToast } from '../components/ToastContainer'
import api from '../services/api'

const ScenarioPage: React.FC = () => {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError, ToastContainer } = useToast()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    try {
      setLoading(true)
      setError(null)
      const scenariosData = await ScenarioService.getScenarios()
      setScenarios(scenariosData)
    } catch (err) {
      setError('Failed to load scenarios')
      console.error('Error loading scenarios:', err)
    } finally {
      setLoading(false)
    }
  }


  const handleDelete = (scenario: Scenario) => {
    setDeleteTarget(scenario)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await api.delete(`scenarios/${encodeURIComponent(deleteTarget.filename)}`)
      const result = response.data
      // Remove from frontend state
      setScenarios(scenarios.filter(s => s.id !== deleteTarget.id))
      showSuccess(`Senaryo başarıyla silindi! (${result.deletedFiles?.length || 1} dosya)`)
    } catch (error: any) {
      console.error('Delete error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata'
      showError(`Silme işlemi başarısız: ${errorMessage}`)
    } finally {
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const handleViewResults = (scenario: Scenario) => {
    // Use the scenarioId from filename (which contains the actual scenarioId, not the document ID)
    const scenarioId = scenario.filename;
    
    console.log('Viewing results for scenario:', scenario.name);
    console.log('  - Scenario ID (scenarioId):', scenarioId);
    console.log('  - Document ID (id):', scenario.id);
    
    // Validate that we have a scenario ID
    if (!scenarioId || scenarioId.trim() === '') {
      console.error('No scenario ID found for scenario:', scenario.name);
      alert('Bu senaryo için ID bulunamadı. Lütfen yönetici ile iletişime geçin.');
      return;
    }
    
    console.log('  - Navigation URL:', `/result?scenarioId=${encodeURIComponent(scenarioId)}`);
    
    // Navigate to Result page with the scenario ID
    // The Result page will then call /api/scenarios/{scenarioId}/formatted-results
    navigate(`/result?scenarioId=${encodeURIComponent(scenarioId)}`)
  }

  if (loading) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading scenarios...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main-content">
        <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          {error}
          <button 
            onClick={loadScenarios}
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content">
      <ToastContainer />
      <ScenariosTable
        scenarios={scenarios}
        onDelete={handleDelete}
        onViewResults={handleViewResults}
      />
      
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Senaryoyu Sil</h3>
            </div>
            <div className="modal-body">
              <p><b>{deleteTarget.name}</b> senaryosunu silmek istediğinize emin misiniz?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={cancelDelete}>İptal</button>
              <button className="btn-delete" onClick={confirmDelete}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioPage 