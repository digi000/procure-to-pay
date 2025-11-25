import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { purchaseAPI } from '../services/api';
import { Upload, Plus, ArrowLeft } from 'lucide-react';

const CreateRequest = () => {
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
  const [proformaFile, setProformaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setProformaFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if user is staff
    if (user.role !== 'staff') {
      setError('Only staff users can create purchase requests');
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Add all form fields to FormData
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add proforma file if selected
      if (proformaFile) {
        submitData.append('proforma', proformaFile);
      }

      await purchaseAPI.createRequest(submitData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Purchase Request</h1>
          <p className="text-gray-600 mt-2">Submit a new purchase request for approval</p>
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
                      Request Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., New Laptop for Development Team"
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
                      placeholder="Detailed description of what you need to purchase..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        Amount ($) *
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
                        placeholder="0.00"
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
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      id="vendor_name"
                      name="vendor_name"
                      required
                      value={formData.vendor_name}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Dell Technologies"
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
                        placeholder="Email or phone number"
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
                      placeholder="Vendor's physical address..."
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
                      Business Justification *
                    </label>
                    <textarea
                      id="business_justification"
                      name="business_justification"
                      required
                      rows={4}
                      value={formData.business_justification}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explain why this purchase is necessary for the business..."
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

              {/* Proforma Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h3>
                <div>
                  <label htmlFor="proforma" className="block text-sm font-medium text-gray-700 mb-2">
                    Proforma Invoice (Optional)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="proforma"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input
                            id="proforma"
                            name="proforma"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.txt"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, TXT up to 10MB
                      </p>
                      {proformaFile && (
                        <p className="text-sm text-green-600">
                          Selected: {proformaFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? 'Creating Request...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest;