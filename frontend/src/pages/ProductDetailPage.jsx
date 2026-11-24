import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, Shield, Calendar, DollarSign, Tag, FileText, Wrench, 
  Trash2, Edit, Plus, Download, Eye, ExternalLink, Clock, AlertTriangle, 
  CheckCircle, XCircle, UploadCloud, Check
} from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    category: 'Electronics',
    purchaseDate: '',
    warrantyExpiry: '',
    purchasePrice: '',
    seller: '',
    notes: ''
  });

  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'invoice',
    file: null
  });
  const [uploading, setUploading] = useState(false);

  const [repairForm, setRepairForm] = useState({
    issue: '',
    description: '',
    status: 'requested',
    repairCost: '',
    repairDate: new Date().toISOString().split('T')[0],
    technicianOrCenter: '',
    notes: ''
  });
  const [submittingRepair, setSubmittingRepair] = useState(false);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const [prodRes, docsRes, repairsRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/documents?productId=${id}`),
        api.get(`/repairs?productId=${id}`)
      ]);

      if (prodRes.data.success) {
        const prod = prodRes.data.data.product;
        setProduct(prod);
        setEditForm({
          name: prod.name || '',
          brand: prod.brand || '',
          model: prod.model || '',
          serialNumber: prod.serialNumber || '',
          category: prod.category || 'Electronics',
          purchaseDate: prod.purchaseDate ? prod.purchaseDate.split('T')[0] : '',
          warrantyExpiry: prod.warrantyExpiry ? prod.warrantyExpiry.split('T')[0] : '',
          purchasePrice: prod.purchasePrice || '',
          seller: prod.seller || '',
          notes: prod.notes || ''
        });
      }

      if (docsRes.data.success) {
        setDocuments(docsRes.data.data.documents || []);
      }

      if (repairsRes.data.success) {
        setRepairs(repairsRes.data.data.repairs || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load product details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/products/${id}`, editForm);
      if (res.data.success) {
        showToast('Product updated successfully!', 'success');
        setProduct(res.data.data.product);
        setShowEditModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update product', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        showToast('Product deleted successfully', 'success');
        navigate('/products');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title || uploadForm.file.name);
      formData.append('type', uploadForm.type);
      formData.append('productId', id);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast('Document uploaded successfully!', 'success');
        setShowUploadModal(false);
        setUploadForm({ title: '', type: 'invoice', file: null });
        // Refresh docs
        const updatedDocs = await api.get(`/documents?productId=${id}`);
        setDocuments(updatedDocs.data.data.documents || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      showToast('Document deleted', 'success');
      setDocuments(documents.filter(d => d._id !== docId));
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const handleRepairSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRepair(true);
      const res = await api.post('/repairs', {
        ...repairForm,
        productId: id
      });
      if (res.data.success) {
        showToast('Repair logged successfully!', 'success');
        setShowRepairModal(false);
        setRepairForm({
          issue: '',
          description: '',
          status: 'requested',
          repairCost: '',
          repairDate: new Date().toISOString().split('T')[0],
          technicianOrCenter: '',
          notes: ''
        });
        // Refresh repairs
        const repRes = await api.get(`/repairs?productId=${id}`);
        setRepairs(repRes.data.data.repairs || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log repair', 'error');
    } finally {
      setSubmittingRepair(false);
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-40 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-900">Product not found</h2>
        <Link to="/products" className="text-indigo-600 font-semibold text-sm mt-3 inline-block">
          &larr; Back to Products
        </Link>
      </div>
    );
  }

  const daysLeft = getDaysLeft(product.warrantyExpiry);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <Edit className="w-4 h-4 text-gray-500" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 rounded-lg text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Product Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                {product.category}
              </span>
              {product.brand && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
                  {product.brand}
                </span>
              )}
              {product.serialNumber && (
                <span className="text-xs font-mono px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                  S/N: {product.serialNumber}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
            {product.model && (
              <p className="text-base text-gray-500 font-medium">Model: {product.model}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block font-medium">Purchase Price</span>
                <span className="text-lg font-bold text-gray-900">
                  {product.purchasePrice ? `$${product.purchasePrice.toLocaleString()}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Purchased On</span>
                <span className="text-sm font-semibold text-gray-900">
                  {product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Seller / Retailer</span>
                <span className="text-sm font-semibold text-gray-900">
                  {product.seller || '—'}
                </span>
              </div>
            </div>

            {product.notes && (
              <div className="pt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-semibold text-gray-700 block mb-0.5 text-xs uppercase tracking-wider">Notes</span>
                {product.notes}
              </div>
            )}
          </div>

          {/* Warranty Status Banner */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Warranty Status
              </div>
              {daysLeft !== null ? (
                <div>
                  <div className="text-2xl font-black text-gray-900">
                    {daysLeft > 0 ? `${daysLeft} Days` : 'Expired'}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {daysLeft > 0 
                      ? `Valid until ${new Date(product.warrantyExpiry).toLocaleDateString()}`
                      : `Lapsed on ${new Date(product.warrantyExpiry).toLocaleDateString()}`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No warranty expiration set for this product.</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200/50 flex items-center justify-between text-xs">
              <span className="text-gray-500">Documents attached:</span>
              <span className="font-bold text-gray-800">{documents.length} files</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Documents Vault & Repair History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Documents Vault */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Attached Documents</h2>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No documents attached yet</p>
                <p className="text-xs text-gray-400 mt-1">Attach receipts, warranties, user manuals, or bills</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div 
                    key={doc._id} 
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 uppercase font-mono">{doc.type} • {(doc.fileSize / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`http://localhost:5000/api/documents/${doc._id}/stream`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={`http://localhost:5000/api/documents/${doc._id}/download`}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-white rounded-md transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Repair History & Service Logs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Repair History</h2>
              </div>
              <button
                onClick={() => setShowRepairModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Repair
              </button>
            </div>

            {repairs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Wrench className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No repairs recorded</p>
                <p className="text-xs text-gray-400 mt-1">Keep track of service visits, fixes, and expenses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {repairs.map(repair => {
                  let badge = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (repair.status === 'completed') badge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (repair.status === 'rejected') badge = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (repair.status === 'in_progress') badge = 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <div 
                      key={repair._id}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900">{repair.issue}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${badge}`}>
                          {repair.status}
                        </span>
                      </div>
                      {repair.description && (
                        <p className="text-xs text-gray-600">{repair.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span>{repair.repairDate ? new Date(repair.repairDate).toLocaleDateString() : 'No date'}</span>
                        <span className="font-bold text-gray-700">
                          {repair.repairCost ? `$${repair.repairCost.toFixed(2)}` : 'Free / Under Warranty'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- EDIT PRODUCT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Product Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Brand</label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Model</label>
                  <input
                    type="text"
                    value={editForm.model}
                    onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    {['Electronics', 'Appliances', 'Automotive', 'Furniture', 'Wearables', 'Tools', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    value={editForm.serialNumber}
                    onChange={e => setEditForm({ ...editForm, serialNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Purchase Date</label>
                  <input
                    type="date"
                    value={editForm.purchaseDate}
                    onChange={e => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Warranty Expiry</label>
                  <input
                    type="date"
                    value={editForm.warrantyExpiry}
                    onChange={e => setEditForm({ ...editForm, warrantyExpiry: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.purchasePrice}
                    onChange={e => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Seller</label>
                  <input
                    type="text"
                    value={editForm.seller}
                    onChange={e => setEditForm({ ...editForm, seller: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPLOAD DOCUMENT MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Attach Document</h3>
            <form onSubmit={handleDocumentUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. BestBuy Official Receipt"
                  value={uploadForm.title}
                  onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Document Type</label>
                <select
                  value={uploadForm.type}
                  onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="warranty">Warranty Card</option>
                  <option value="manual">User Manual</option>
                  <option value="repair">Repair Bill</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Choose File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG REPAIR MODAL --- */}
      {showRepairModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Log Repair or Service</h3>
            <form onSubmit={handleRepairSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Issue / Problem *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Battery replacement, Cracked screen"
                  value={repairForm.issue}
                  onChange={e => setRepairForm({ ...repairForm, issue: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Status</label>
                <select
                  value={repairForm.status}
                  onChange={e => setRepairForm({ ...repairForm, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Repair Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={repairForm.repairCost}
                    onChange={e => setRepairForm({ ...repairForm, repairCost: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Date</label>
                  <input
                    type="date"
                    value={repairForm.repairDate}
                    onChange={e => setRepairForm({ ...repairForm, repairDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Service Center / Technician</label>
                <input
                  type="text"
                  placeholder="e.g. Official Apple Store"
                  value={repairForm.technicianOrCenter}
                  onChange={e => setRepairForm({ ...repairForm, technicianOrCenter: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Notes / Details</label>
                <textarea
                  rows="2"
                  placeholder="Details of fix or warranty claim..."
                  value={repairForm.notes}
                  onChange={e => setRepairForm({ ...repairForm, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRepairModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepair}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submittingRepair ? 'Saving...' : 'Save Repair'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Product?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{product.name}</span>? 
              This will not delete previously uploaded documents from your vault, but will detach them from this product.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
