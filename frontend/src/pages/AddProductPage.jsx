import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, UploadCloud, Sparkles, FileText, CheckCircle, 
  AlertCircle, ShieldCheck, Tag, DollarSign, Calendar, Clock, RefreshCw, Copy, Check
} from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Appliances',
  'Automotive',
  'Furniture',
  'Wearables',
  'Tools',
  'Other'
];

export default function AddProductPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('ocr'); // 'ocr' or 'manual'
  const [selectedFile, setSelectedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedDocId, setExtractedDocId] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Product form data
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    category: 'Electronics',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: '',
    purchasePrice: '',
    seller: '',
    notes: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setExtractedText('');
      setOcrSuccess(false);
    }
  };

  const handleExtractOCR = async () => {
    if (!selectedFile) {
      showToast('Please select an invoice or receipt image/PDF first', 'error');
      return;
    }

    try {
      setExtracting(true);
      setProcessingStatus('Uploading invoice to GridFS vault...');
      const data = new FormData();
      data.append('file', selectedFile);

      // Step 1: Upload document to GridFS
      const uploadRes = await api.post('/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!uploadRes.data?.success) {
        throw new Error(uploadRes.data?.message || uploadRes.data?.error || 'Failed to upload document');
      }

      const uploadedDoc = uploadRes.data.data?.document || uploadRes.data.document;
      const documentId = uploadedDoc?._id || uploadedDoc?.id;
      
      if (!documentId) {
        throw new Error('Upload succeeded but no document ID was returned by the server.');
      }
      setExtractedDocId(documentId);

      // Step 2: Call internal OCR extraction endpoint
      setProcessingStatus('Extracting invoice text...');
      const ocrRes = await api.post('/ocr/extract', { documentId });

      if (ocrRes.data?.success) {
        const text = ocrRes.data.rawText || '';
        setExtractedText(text);
        setOcrSuccess(true);

        if (text.trim().length > 0) {
          showToast('Text extraction completed.', 'success');
        } else {
          showToast('No readable text found. Please try a clearer scan.', 'info');
        }
      } else {
        throw new Error(ocrRes.data?.error || 'Text extraction failed. Please try again.');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Text extraction failed. Please try again.', 'error');
    } finally {
      setExtracting(false);
      setProcessingStatus('');
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    showToast('Extracted text copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Product name is required', 'error');
      return;
    }

    try {
      setSaving(true);

      // Standard product creation
      const res = await api.post('/products', {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : 0
      });

      if (res.data?.success) {
        const product = res.data.data?.product || res.data.product;
        const productId = product?._id || product?.id;

        // If an invoice document was uploaded during OCR, associate it with this new product
        if (extractedDocId && productId) {
          try {
            await api.patch(`/documents/${extractedDocId}`, { productId });
          } catch (patchErr) {
            // Non-blocking if patch is unsupported or already linked
          }
        }

        showToast('Product saved successfully!', 'success');
        navigate(productId ? `/products/${productId}` : '/products');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Title Banner */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            AI-Powered Registration
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Add New Purchase</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Upload your invoice to automatically parse prices, dates, serial numbers, and warranty terms.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('ocr')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'ocr' 
                  ? 'bg-white text-indigo-900 shadow-md' 
                  : 'bg-indigo-800/60 text-white hover:bg-indigo-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart OCR Extract
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'manual' 
                  ? 'bg-white text-indigo-900 shadow-md' 
                  : 'bg-indigo-800/60 text-white hover:bg-indigo-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* OCR File Upload Zone (if activeTab === 'ocr') */}
        {activeTab === 'ocr' && (
          <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
            <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-xl p-8 text-center transition">
              <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">Upload Receipt, Invoice or Bill</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Supports PDF, JPG, PNG, or WebP up to 10MB
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <input
                  type="file"
                  id="ocrFileInput"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="ocrFileInput"
                  className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                >
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </label>

                <button
                  type="button"
                  onClick={handleExtractOCR}
                  disabled={!selectedFile || extracting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {extracting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {processingStatus || 'Extracting invoice text...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Text
                    </>
                  )}
                </button>
              </div>

              {ocrSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Text extraction completed. Inspect the extracted text below.
                </div>
              )}

              {/* Extracted Text Review Area */}
              {extractedText && (
                <div className="mt-6 text-left bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Extracted Invoice Text
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-gray-200 px-2.5 py-1 rounded-md transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Text
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows="6"
                    readOnly
                    value={extractedText}
                    className="w-full text-xs font-mono bg-white border border-gray-200 rounded-lg p-3 text-gray-800 focus:outline-none"
                    placeholder="Extracted text will appear here..."
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Review and copy any needed invoice details into the product fields below. OCR text is stored with your document.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Details Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            Product & Warranty Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MacBook Pro 16-inch M3 Max"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. Apple, Samsung, Sony"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Model Number
              </label>
              <input
                type="text"
                placeholder="e.g. A2991, WH-1000XM5"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g. C02G41KSMD6R"
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Warranty Expiry Date
              </label>
              <input
                type="date"
                value={formData.warrantyExpiry}
                onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Purchase Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Seller / Retail Store
              </label>
              <input
                type="text"
                placeholder="e.g. Amazon, Best Buy, Apple Store"
                value={formData.seller}
                onChange={e => setFormData({ ...formData, seller: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Notes & Additional Details
              </label>
              <textarea
                rows="3"
                placeholder="Extra details, insurance policy, accessories included..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              to="/products"
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
