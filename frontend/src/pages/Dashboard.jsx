import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {user?.first_name || user?.username}!
      </h1>
      <p className="text-gray-600 mt-2">
        You are logged in as {user?.display_role || user?.role}
      </p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard cards will go here based on user role */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-gray-600 mt-2">Role-specific actions will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;