import React from 'react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder Stat Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Employees (HR)</p>
          <p className="text-3xl font-bold text-gray-900">1,248</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Salary (Payroll)</p>
          <p className="text-3xl font-bold text-gray-900">$2.4M</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Sync Status</p>
          <p className="text-3xl font-bold text-green-600">Active</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">System Integration Overview</h3>
        <p className="text-gray-600">
          This dashboard connects the legacy SQL Server <code>HUMAN_2025</code> database and the 
          MySQL <code>payroll</code> database. All connections and logic are handled via the Flask API.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
