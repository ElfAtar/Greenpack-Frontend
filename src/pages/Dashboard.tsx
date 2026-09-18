import React from 'react'

const Dashboard: React.FC = () => {
  return (
    <div className="main-content">
      <h2>Dashboard</h2>
      <p>Welcome to your dashboard. This is where your main content will appear.</p>
      
      {/* Add your dashboard content here */}
      <div className="dashboard-content">
        <div className="dashboard-section">
          <h3>Quick Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Scenarios</h4>
              <p className="stat-number">12</p>
            </div>
            <div className="stat-card">
              <h4>Active Products</h4>
              <p className="stat-number">45</p>
            </div>
            <div className="stat-card">
              <h4>Total Groups</h4>
              <p className="stat-number">8</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 