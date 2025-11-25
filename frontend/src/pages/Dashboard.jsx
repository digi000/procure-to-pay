import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

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
      
      {/* Staff-specific actions */}
      {user?.role === 'staff' && (
        <div className="mt-8">
          <Link
            to="/create-request"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Request
          </Link>
        </div>
      )}
      
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