import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle } from 'lucide-react';
import RequestList from '../components/RequestList';

const Dashboard = () => {
  const { user } = useAuth();

  const getRoleBasedMessage = () => {
    if (user?.role === 'staff') {
      return "Create new purchase requests and track their approval status.";
    } else if (user?.role === 'approver_l1' || user?.role === 'approver_l2') {
      return "Review and approve pending purchase requests from staff.";
    } else if (user?.role === 'finance') {
      return "Monitor approved purchase requests and manage payments.";
    }
    return "Welcome to the procurement system.";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-2">
          You are logged in as <span className="font-medium">{user?.display_role || user?.role}</span>
        </p>
        <p className="text-gray-500 mt-1">
          {getRoleBasedMessage()}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {user?.role === 'staff' && (
          <>
            <Link
              to="/create-request"
              className="bg-white p-6 rounded-lg shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center">
                <Plus className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">New Request</h3>
                  <p className="text-gray-600 mt-1">Create a new purchase request</p>
                </div>
              </div>
            </Link>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Requests</h3>
                  <p className="text-gray-600 mt-1">View all your purchase requests</p>
                </div>
              </div>
            </div>
          </>
        )}

        {(user?.role === 'approver_l1' || user?.role === 'approver_l2') && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <p className="text-gray-600 mt-1">Review requests waiting for your approval</p>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'finance' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Approved Requests</h3>
                <p className="text-gray-600 mt-1">View requests ready for payment processing</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Request List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <RequestList />
      </div>
    </div>
  );
};

export default Dashboard;