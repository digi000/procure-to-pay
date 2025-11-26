import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Phone,
  MapPin,
  Edit,
  Upload,
  Receipt
} from 'lucide-react';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const response = await purchaseAPI.getRequest(id);
      setRequest(response.data);
    } catch (err) {
      setError('Failed to load request details');
      console.error('Error loading request:', err);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = () => {
    if (!user || !request) return false;
    if (request.status !== 'pending') return false;
    
    const isApprover = user.role === 'approver_l1' || user.role === 'approver_l2';
    if (!isApprover) return false;
    
    // Check if user has already approved/rejected this request
    const userApproval = request.approvals?.find(a => a.approver === user.id);
    if (userApproval) return false;
    
    return true;
  };

  const canEdit = () => {
    if (!user || !request) return false;
    if (request.status !== 'pending') return false;
    if (user.role !== 'staff') return false;
    if (request.created_by !== user.id) return false;
    return true;
  };

  const canSubmitReceipt = () => {
    if (!user || !request) return false;
    if (request.status !== 'approved') return false;
    if (user.role !== 'staff') return false;
    if (request.created_by !== user.id) return false;
    if (request.receipt) return false; // Already has receipt
    return true;
  };

  const openReceiptModal = () => {
    setReceiptFile(null);
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptFile(null);
  };

  const handleReceiptFileChange = (e) => {
    setReceiptFile(e.target.files[0]);
  };

  const handleReceiptSubmit = async () => {
    if (!receiptFile) return;
    
    setActionLoading(true);
    setValidationResult(null);
    try {
      const response = await purchaseAPI.submitReceipt(id, receiptFile);
      closeReceiptModal();
      if (response.data.validation) {
        setValidationResult(response.data.validation);
      }
      await loadRequest();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.response?.data?.message || 'Failed to submit receipt';
      setError(errorMessage);
      closeReceiptModal();
    } finally {
      setActionLoading(false);
    }
  };

  const openApprovalModal = (action) => {
    setApprovalAction(action);
    setComments('');
    setShowApprovalModal(true);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalAction(null);
    setComments('');
  };

  const handleApprovalAction = async () => {
    if (!approvalAction) return;
    
    setActionLoading(true);
    try {
      if (approvalAction === 'approve') {
        await purchaseAPI.approveRequest(id, comments);
      } else {
        await purchaseAPI.rejectRequest(id, comments);
      }
      closeApprovalModal();
      // Reload the request to show updated status
      await loadRequest();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || `Failed to ${approvalAction} request`;
      setError(errorMessage);
      closeApprovalModal();
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
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

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
              <p className="text-gray-500 mt-1">Request #{request.id}</p>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit() && (
                <button
                  onClick={() => navigate(`/requests/${id}/edit`)}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                <span className="ml-2">{request.status_display}</span>
              </span>
              {request.urgency && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                  {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Approval Actions */}
          {canApprove() && (
            <div className="mt-4 flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-800 font-medium">This request needs your approval:</span>
              <button
                onClick={() => openApprovalModal('approve')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => openApprovalModal('reject')}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
            </div>
          )}

          {/* Receipt Submission */}
          {canSubmitReceipt() && (
            <div className="mt-4 flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-800 font-medium">This request is approved. Submit your receipt:</span>
              <button
                onClick={openReceiptModal}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Receipt
              </button>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start">
                {validationResult.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                )}
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    validationResult.valid ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {validationResult.valid 
                      ? 'Receipt Validated Successfully' 
                      : 'Receipt Validation Warnings'}
                  </h3>
                  
                  {validationResult.error && (
                    <p className="mt-1 text-sm text-yellow-700">
                      {validationResult.error}
                    </p>
                  )}
                  
                  {validationResult.discrepancies && validationResult.discrepancies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {validationResult.discrepancies.map((disc, index) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded text-sm ${
                            disc.severity === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          <span className="font-medium">{disc.field}:</span> {disc.message}
                          <div className="mt-1 text-xs">
                            <span>PO: {disc.po_value}</span>
                            <span className="mx-2">→</span>
                            <span>Receipt: {disc.receipt_value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setValidationResult(null)}
                    className="mt-3 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {request.description || 'No description provided.'}
              </p>
            </div>

            {/* Business Justification */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Justification</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {request.business_justification || 'No justification provided.'}
              </p>
            </div>

            {/* Vendor Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendor Name</p>
                    <p className="text-gray-900">{request.vendor_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact</p>
                    <p className="text-gray-900">{request.vendor_contact || 'N/A'}</p>
                  </div>
                </div>
                {request.vendor_address && (
                  <div className="flex items-start md:col-span-2">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-gray-900">{request.vendor_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
              <div className="space-y-3">
                {request.proforma ? (
                  <a
                    href={request.proforma}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="text-gray-700">Proforma Invoice</span>
                    <Download className="h-4 w-4 text-gray-400 ml-auto" />
                  </a>
                ) : null}
                {request.quotation_comparison ? (
                  <a
                    href={request.quotation_comparison}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Quotation Comparison</span>
                    <Download className="h-4 w-4 text-gray-400 ml-auto" />
                  </a>
                ) : null}
                {request.specification_sheet ? (
                  <a
                    href={request.specification_sheet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 text-purple-500 mr-3" />
                    <span className="text-gray-700">Specification Sheet</span>
                    <Download className="h-4 w-4 text-gray-400 ml-auto" />
                  </a>
                ) : null}
                {request.purchase_order ? (
                  <a
                    href={request.purchase_order}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 text-indigo-500 mr-3" />
                    <span className="text-gray-700">Purchase Order</span>
                    <Download className="h-4 w-4 text-gray-400 ml-auto" />
                  </a>
                ) : null}
                {request.receipt ? (
                  <a
                    href={request.receipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Receipt className="h-5 w-5 text-emerald-500 mr-3" />
                    <span className="text-gray-700">Receipt</span>
                    <Download className="h-4 w-4 text-gray-400 ml-auto" />
                  </a>
                ) : null}
                {!request.proforma && !request.quotation_comparison && !request.specification_sheet && !request.purchase_order && !request.receipt && (
                  <p className="text-gray-500 text-sm">No documents attached.</p>
                )}
              </div>
            </div>

            {/* Approval History */}
            {request.approvals && request.approvals.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h2>
                <div className="space-y-4">
                  {request.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className={`flex items-start p-4 rounded-lg ${
                        approval.approved ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      {approval.approved ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {approval.approver_name}
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              ({approval.approver_role})
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatShortDate(approval.created_at)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Level {approval.approval_level} - {approval.approved ? 'Approved' : 'Rejected'}
                        </p>
                        {approval.comments && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            "{approval.comments}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amount Card */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amount</h2>
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500 mr-2" />
                <span className="text-3xl font-bold text-gray-900">
                  {parseFloat(request.amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Request Info */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Info</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created By</p>
                    <p className="text-gray-900">{request.created_by_name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created On</p>
                    <p className="text-gray-900">{formatDate(request.created_at)}</p>
                  </div>
                </div>
                {request.requested_delivery_date && (
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Delivery Date</p>
                      <p className="text-gray-900">{formatShortDate(request.requested_delivery_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Codes */}
            {(request.cost_center || request.gl_account || request.budget_code || request.project_code) && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Info</h2>
                <div className="space-y-3">
                  {request.cost_center && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cost Center</p>
                      <p className="text-gray-900">{request.cost_center}</p>
                    </div>
                  )}
                  {request.gl_account && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">GL Account</p>
                      <p className="text-gray-900">{request.gl_account}</p>
                    </div>
                  )}
                  {request.budget_code && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Budget Code</p>
                      <p className="text-gray-900">{request.budget_code}</p>
                    </div>
                  )}
                  {request.project_code && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Project Code</p>
                      <p className="text-gray-900">{request.project_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h3>
              <p className="text-gray-600 mb-4">
                {approvalAction === 'approve'
                  ? 'Are you sure you want to approve this purchase request?'
                  : 'Are you sure you want to reject this purchase request?'}
              </p>
              <div className="mb-4">
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                  Comments {approvalAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="comments"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={approvalAction === 'approve' ? 'Optional comments...' : 'Please provide a reason for rejection...'}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeApprovalModal}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalAction}
                  disabled={actionLoading || (approvalAction === 'reject' && !comments.trim())}
                  className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Submit Receipt
              </h3>
              <p className="text-gray-600 mb-4">
                Upload the receipt for this approved purchase request.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt File <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-md">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="receipt-file" className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-500">Upload file</span>
                        <input
                          id="receipt-file"
                          type="file"
                          onChange={handleReceiptFileChange}
                          className="sr-only"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PDF, Word, or Image</p>
                  </div>
                </div>
                {receiptFile && (
                  <p className="mt-2 text-sm text-green-600 flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {receiptFile.name}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeReceiptModal}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiptSubmit}
                  disabled={actionLoading || !receiptFile}
                  className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Uploading...' : 'Submit Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetail;
