import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { purchaseAPI } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

const EditRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    vendor_name: '',
    vendor_contact: '',
    vendor_address: '',
    business_justification: '',
    urgency: 'normal',
    cost_center: '',
    gl_account: '',
    budget_code: '',
    project_code: '',
    requested_delivery_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [originalRequest, setOriginalRequest] = useState(null);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const response = await purchaseAPI.getRequest(id);
      const request = response.data;
      setOriginalRequest(request);
      
      // Check if user can edit
      if (request.status !== 'pending') {
        setError('Only pending requests can be edited');
        return;
      }
      
      if (user.role !== 'staff' || request.created_by !== user.id) {
        setError('You can only edit your own requests');
        return;
      }
      
      // Populate form with existing data
      setFormData({
        title: request.title || '',
        description: request.description || '',
        amount: request.amount || '',
        vendor_name: request.vendor_name || '',
        vendor_contact: request.vendor_contact || '',
        vendor_address: request.vendor_address || '',
        business_justification: request.business_justification || '',
        urgency: request.urgency || 'normal',
        cost_center: request.cost_center || '',
        gl_account: request.gl_account || '',
        budget_code: request.budget_code || '',
        project_code: request.project_code || '',
        requested_delivery_date: request.requested_delivery_date || ''
      });
    } catch (err) {
      setError('Failed to load request');
      console.error('Error loading request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Build the data object, only including non-empty fields
      const updateData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          updateData[key] = formData[key];
        }
      });

      await purchaseAPI.updateRequest(id, updateData);
      navigate(`/requests/${id}`);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData) {
        if (errorData.detail) {
          setError(errorData.detail);
        } else if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          setError(errorMessages);
        } else {
          setError('Failed to update request');
        }
      } else {
        setError('Failed to update request');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !originalRequest) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/requests/${id}`)}
            className="flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Request
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Purchase Request</h1>
          <p className="text-gray-600 mt-2">Update request #{id}</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Request Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        Amount ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        required
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                        Urgency
                      </label>
                      <select
                        id="urgency"
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="vendor_name" className="block text-sm font-medium text-gray-700">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="vendor_name"
                      name="vendor_name"
                      required
                      value={formData.vendor_name}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="vendor_contact" className="block text-sm font-medium text-gray-700">
                        Vendor Contact
                      </label>
                      <input
                        type="text"
                        id="vendor_contact"
                        name="vendor_contact"
                        value={formData.vendor_contact}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="requested_delivery_date" className="block text-sm font-medium text-gray-700">
                        Requested Delivery Date
                      </label>
                      <input
                        type="date"
                        id="requested_delivery_date"
                        name="requested_delivery_date"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.requested_delivery_date}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="vendor_address" className="block text-sm font-medium text-gray-700">
                      Vendor Address
                    </label>
                    <textarea
                      id="vendor_address"
                      name="vendor_address"
                      rows={2}
                      value={formData.vendor_address}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Business Justification */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="business_justification" className="block text-sm font-medium text-gray-700">
                      Business Justification <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="business_justification"
                      name="business_justification"
                      required
                      rows={4}
                      value={formData.business_justification}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="cost_center" className="block text-sm font-medium text-gray-700">
                        Cost Center
                      </label>
                      <input
                        type="text"
                        id="cost_center"
                        name="cost_center"
                        value={formData.cost_center}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="gl_account" className="block text-sm font-medium text-gray-700">
                        GL Account
                      </label>
                      <input
                        type="text"
                        id="gl_account"
                        name="gl_account"
                        value={formData.gl_account}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="budget_code" className="block text-sm font-medium text-gray-700">
                        Budget Code
                      </label>
                      <input
                        type="text"
                        id="budget_code"
                        name="budget_code"
                        value={formData.budget_code}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="project_code" className="block text-sm font-medium text-gray-700">
                        Project Code
                      </label>
                      <input
                        type="text"
                        id="project_code"
                        name="project_code"
                        value={formData.project_code}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate(`/requests/${id}`)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRequest;
