import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchaseAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, User, Clock, CheckCircle, XCircle, HelpCircle, ChevronRight } from 'lucide-react';

const RequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await purchaseAPI.getRequests();
      const data = response.data.results || response.data;
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Purchase Requests
          {user?.is_staff_role && <span className="text-sm font-normal text-gray-600 ml-2">(Your requests)</span>}
        </h2>
        <div className="text-sm text-gray-500">
          {requests.length} request{requests.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No requests found</h3>
          <p className="mt-2 text-gray-500">
            {user?.is_staff_role 
              ? "You haven't created any purchase requests yet." 
              : "There are no requests to display."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request.id}>
                <Link to={`/requests/${request.id}`} className="block px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <p className={`ml-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(request.status)}`}>
                        {request.status_display}
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      #{request.id}
                      <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {request.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {request.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${parseFloat(request.amount).toLocaleString()}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {request.created_by_name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(request.created_at)}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      {request.vendor_name && (
                        <span>Vendor: {request.vendor_name}</span>
                      )}
                    </div>
                  </div>

                  {request.approvals && request.approvals.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">
                        Approved by: {request.approvals.map(a => a.approver_name).join(', ')}
                      </p>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RequestList;