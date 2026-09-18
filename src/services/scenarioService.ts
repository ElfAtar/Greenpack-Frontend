import type { Scenario } from '../components/ScenariosTable'
import type { DefaultValues } from '../types';
import api from './api';

export interface ScenarioFile {
  filename: string
  content: string
  timestamp: string
  scenarioName: string
  products: string[]
}

export interface ApiScenario {
  id: string
  scenarioId: string
  scenarioName: string
  runDateTime: string
  runMode: string
  cartoningMethods: string[]
  optionCount: number
  minBoxUtil: number
  includeOrderData: boolean
  totalBoxCount: number
  orderItems?: string[]
  productNames?: string[]
  name: string // Display name based on run mode
  notes: string
  unitPalletCost: number
  handlingCost: number
  createdBy: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export class ScenarioService {
  public static async getScenarios(): Promise<Scenario[]> {
    try {
      const response = await api.get('scenarios');
      
      // Return empty array for 400/404 errors (no scenarios exist yet)
      if (response.status === 400 || response.status === 404) {
        console.log('No scenarios found, returning empty array')
        return []
      }
      
      const apiScenarios: ApiScenario[] = response.data
      
      // Handle null/undefined response
      if (!apiScenarios || !Array.isArray(apiScenarios)) {
        return []
      }
      
      return apiScenarios.map(apiScenario => {
        // Map English run modes to Turkish for display
        const getTurkishRunMode = (runMode: string) => {
          switch (runMode?.toLowerCase()) {
            case 'single product':
              return 'Tek Ürün';
            case 'group':
              return 'Ürün Grubu';
            case 'all products':
              return 'Tüm Ürünler';
            default:
              return runMode; // Fallback to original if not recognized
          }
        };

        return {
          id: apiScenario.id,
          name: apiScenario.scenarioName,
          filename: apiScenario.scenarioId, // Use scenarioId as filename for navigation
          products: apiScenario.orderItems || [], // Use orderItems as products
          runMode: getTurkishRunMode(apiScenario.runMode),
          productDisplay: apiScenario.name, // Use the name field from backend (should contain actual product name)
          notes: apiScenario.notes,
          runDate: `${new Date(apiScenario.runDateTime).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })}\n${new Date(apiScenario.runDateTime).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          results: {
            combinations: [],
            summary: {},
            totalCombinations: apiScenario.optionCount || 0, // Use optionCount from backend
            headers: []
          }, // Will be loaded separately when needed
          creatorUser: apiScenario.createdBy,
          lastModifierUser: apiScenario.createdBy,
          status: true, // All scenarios from DB are active
          runDateTime: new Date(apiScenario.runDateTime) // Add raw date for sorting
        };
      })
    } catch (error) {
      console.error('Error fetching scenarios:', error)
      throw error
    }
  }

  public static async getScenarioContent(filename: string): Promise<string> {
    try {
      const response = await api.get(`scenarios/${encodeURIComponent(filename)}`);
      return response.data.content;
    } catch (error) {
      console.error('Error getting scenario content:', error)
      throw error
    }
  }

  public static async getDefaultValues(): Promise<DefaultValues> {
    try {
      const response = await api.get('upload/default-values');
      return response.data;
    } catch (error) {
      console.error('Error fetching default values:', error);
      throw error;
    }
  }

  public static async updateDefaultValues(defaultValues: DefaultValues): Promise<void> {
    try {
      await api.put('upload/default-values', defaultValues);
    } catch (error) {
      console.error('Error updating default values:', error);
      throw error;
    }
  }

  public static async updateRunDefaultValues(defaultValues: DefaultValues): Promise<void> {
    try {
      await api.put('upload/run-default-values', defaultValues);
    } catch (error) {
      console.error('Error updating run default values:', error);
      throw error;
    }
  }
} 