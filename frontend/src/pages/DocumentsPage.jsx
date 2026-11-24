import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  FileText, UploadCloud, Search, Download, Eye, Trash2, 
  Filter, Tag, Calendar, HardDrive, Plus, Shield
} from 'lucide-react';

const DOC_TYPES = ['all', 'invoice', 'receipt', 'warranty', 'manual', 'repair', 'other'];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { showToast } = useToast();

  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'invoice',
    productId: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, prodsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/products')
      ]);

      if (docsRes.data.success) {
        setDocuments(docsRes.data.data.documents || []);
      }
      if (prodsRes.data.success) {
        setProducts(prodsRes.data.data.products || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e) => {
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
      if (uploadForm.productId) {
        formData.append('productId', uploadForm.productId);
      }

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast('Document uploaded successfully to GridFS vault!', 'success');
        setShowUploadModal(false);
        setUploadForm({ title: '', type: 'invoice', productId: '', file: null });
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document from GridFS?')) return;
    try {
      const res = await api.delete(`/documents/${docId}`);
      if (res.data.success) {
        showToast('Document deleted from vault', 'success');
        setDocuments(documents.filter(d => d._id !== docId));
      }
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.product?.name && doc.product.name.toLowerCase().includes(search.toLowerCase())) ||
      doc.fileName.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === 'all' || doc.type === selectedType;

    return matchesSearch && matchesType;
  });

  const totalBytes = documents.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents Vault</h1>
          <p className="text-gray-500 text-sm mt-1">
            Secure cloud storage powered by MongoDB GridFS for all your purchase proofs
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Files</p>
            <p className="text-xl font-bold text-gray-900">{documents.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Vault Storage</p>
            <p className="text-xl font-bold text-gray-900">{totalMB} MB</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Security</p>
            <p className="text-xl font-bold text-gray-900">GridFS Chunked</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents or products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {DOC_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                selectedType === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table / Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md mx-auto shadow-sm">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No documents found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Upload your receipts, warranties, and invoices to protect your consumer rights.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Document</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Linked Product</th>
                  <th className="px-6 py-3.5">File Size</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredDocs.map(doc => (
                  <tr key={doc._id} className="hover:bg-gray-50/75 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{doc.title}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md uppercase bg-gray-100 text-gray-700">
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {doc.product ? (
                        <span className="font-semibold text-indigo-600">{doc.product.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unattached</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`http://localhost:5000/api/documents/${doc._id}/stream`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={`http://localhost:5000/api/documents/${doc._id}/download`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document to Vault</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sony Bravia 65 Invoice"
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
                <label className="text-xs font-semibold text-gray-700">Attach to Product (Optional)</label>
                <select
                  value={uploadForm.productId}
                  onChange={e => setUploadForm({ ...uploadForm, productId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- No specific product --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} {p.brand ? `(${p.brand})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Choose File</label>
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
                  {uploading ? 'Uploading...' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
