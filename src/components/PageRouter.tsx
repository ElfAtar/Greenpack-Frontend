import React from 'react'
// import Dashboard from '../pages/Dashboard'
import Scenario from '../pages/Scenario'
import ProductList from '../pages/ProductList'
import BoxList from '../pages/BoxList'
import ProductGroupList from '../pages/ProductGroupList'

import Users from '../pages/Users'
import CartonList from '../pages/CartonList';
import Visualization from '../pages/Visualization';
import Run from '../pages/Run';

interface PageRouterProps {
  activePage: string
}

const PageRouter: React.FC<PageRouterProps> = ({ activePage }) => {
  switch (activePage) {
    // case 'dashboard':
    //   return <Dashboard />
    case 'scenario':
      return <Scenario />
    case 'products':
      return <ProductList />
    case 'boxes':
      return <BoxList />
    case 'groups':
      return <ProductGroupList />

    case 'users':
      return <Users />
    case 'cartons':
      return <CartonList />;
    case 'visualization':
      return <Visualization />
    case 'run':
      return <Run />
    default:
      return <Run />
  }
}

export default PageRouter 