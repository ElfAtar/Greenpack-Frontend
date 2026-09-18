import type { NavigationItem } from '../components/layout/Sidebar'
import {
  // DashboardIcon,
  ScenarioIcon,
  ProductListIcon,
  BoxListIcon,
  GroupListIcon,
  DefaultValuesIcon,
  UsersIcon,
  CartonIcon,
  RunIcon,
  // VisualizationIcon
} from '../components/icons'

export const navigationItems: NavigationItem[] = [
  // {
  //   id: 'dashboard',
  //   label: 'Dashboard',
  //   icon: DashboardIcon,
  //   path: '/dashboard'
  // },
  {
    id: 'run',
    label: 'Senaryo Çalıştır',
    icon: RunIcon,
    path: '/run'
  },
  {
    id: 'scenario',
    label: 'Senaryolar',
    icon: ScenarioIcon,
    path: '/scenario'
  },
  {
    id: 'veri',
    label: 'Veri',
    icon: GroupListIcon,
    children: [
      {
        id: 'products',
        label: 'Ürünler',
        icon: ProductListIcon,
        path: '/products'
      },
      {
        id: 'boxes',
        label: 'Kutular',
        icon: BoxListIcon,
        path: '/boxes'
      },
      {
        id: 'cartons',
        label: 'Koliler',
        icon: CartonIcon,
        path: '/cartons'
      },
      {
        id: 'groups',
        label: 'Ürün Grupları',
        icon: GroupListIcon,
        path: '/groups'
      },
      {
        id: 'default-values',
        label: 'Varsayılan Değerler',
        icon: DefaultValuesIcon,
        path: '/default-values'
      }
      
    ]
  },
  {
    id: 'users',
    label: 'Kullanıcılar',
    icon: UsersIcon,
    path: '/users'
  }
  // {
  //   id: 'visualization',
  //   label: 'Görselleştirme',
  //   icon: VisualizationIcon,
  //   path: '/visualization'
  // }
  
] 