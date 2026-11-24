import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Plus, Search, Filter, ShieldCheck, AlertTriangle, 
  Clock, ArrowRight, Package, Tag, Trash2, Edit3 
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Electronics',
  'Appliances',
  'Automotive',
  'Furniture',
  'Wearables',
  'Tools',
  'Other'
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, expiring, expired
  const { showToast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      if (res.data.success) {
        setProducts(res.data.data.products || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(search.toLowerCase())) ||
      (p.serialNumber && p.serialNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesStatus = true;
    const daysLeft = getDaysLeft(p.warrantyExpiry);

    if (statusFilter === 'active') {
      matchesStatus = daysLeft === null || daysLeft > 30;
    } else if (statusFilter === 'expiring') {
      matchesStatus = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
    } else if (statusFilter === 'expired') {
      matchesStatus = daysLeft !== null && daysLeft < 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Portfolio</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your registered purchases, warranties, and receipts
          </p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, brand, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat} Categories</option>
              ))}
            </select>
          </div>

          {/* Warranty Status Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-md transition ${statusFilter === 'all' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`flex-1 py-1.5 rounded-md transition ${statusFilter === 'active' ? 'bg-white shadow text-emerald-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('expiring')}
              className={`flex-1 py-1.5 rounded-md transition ${statusFilter === 'expiring' ? 'bg-white shadow text-amber-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Expiring
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`flex-1 py-1.5 rounded-md transition ${statusFilter === 'expired' ? 'bg-white shadow text-rose-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Expired
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No products found</h3>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            {search || selectedCategory !== 'All' || statusFilter !== 'all' 
              ? 'Try adjusting your search criteria or filters.' 
              : 'Start building your digital vault by adding your first product with invoice OCR.'}
          </p>
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Add First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const daysLeft = getDaysLeft(product.warrantyExpiry);
            let badgeBg = 'bg-gray-100 text-gray-700';
            let badgeLabel = 'No Warranty Info';
            let badgeIcon = <Clock className="w-3.5 h-3.5" />;

            if (daysLeft !== null) {
              if (daysLeft < 0) {
                badgeBg = 'bg-rose-50 text-rose-700 border border-rose-200';
                badgeLabel = `Expired ${Math.abs(daysLeft)}d ago`;
                badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
              } else if (daysLeft <= 30) {
                badgeBg = 'bg-amber-50 text-amber-700 border border-amber-200';
                badgeLabel = `${daysLeft} days remaining`;
                badgeIcon = <Clock className="w-3.5 h-3.5 text-amber-500" />;
              } else {
                badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                badgeLabel = `${daysLeft} days remaining`;
                badgeIcon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />;
              }
            }

            return (
              <div 
                key={product._id} 
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                      {product.category || 'General'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${badgeBg}`}>
                      {badgeIcon}
                      {badgeLabel}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">
                    <Link to={`/products/${product._id}`}>
                      {product.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[product.brand, product.model].filter(Boolean).join(' • ') || 'No brand/model specified'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block">Purchase Price</span>
                      <span className="font-semibold text-gray-900">
                        {product.purchasePrice ? `$${product.purchasePrice.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Purchased On</span>
                      <span className="font-semibold text-gray-900">
                        {product.purchaseDate ? new Date(product.purchaseDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">
                    {product.serialNumber ? `S/N: ${product.serialNumber}` : 'No S/N'}
                  </span>
                  <Link
                    to={`/products/${product._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
