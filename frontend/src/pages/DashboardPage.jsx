import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  PlusCircle,
  FileText,
  Calendar,
  Bot,
  ArrowRight,
  Clock
} from 'lucide-react';
import api from '../services/api';

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [repairsData, setRepairsData] = useState({ repairs: [], analytics: { totalCost: 0 } });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [prodRes, repRes, notifRes] = await Promise.all([
          api.get('/products'),
          api.get('/repairs'),
          api.get('/notifications?unreadOnly=true')
        ]);

        setProducts(prodRes.data.products || []);
        setRepairsData(repRes.data || { repairs: [], analytics: { totalCost: 0 } });
        setNotifications(notifRes.data.notifications || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const now = new Date();
  const activeWarranties = products.filter(
    (p) => p.warrantyEndDate && new Date(p.warrantyEndDate) >= now
  );

  const expiringSoon = products.filter((p) => {
    if (!p.warrantyEndDate) return false;
    const diff = new Date(p.warrantyEndDate) - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your registered items, warranty expirations, and service records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/products/add"
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
          <Link
            to="/ai-chat"
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all flex items-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{products.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Warranties</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{activeWarranties.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring in 30 Days</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{expiringSoon.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Repair Expenses</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              ${(repairsData.analytics?.totalCost || 0).toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      {/* Urgent Expiries Banner */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <h3 className="font-bold text-amber-900 text-sm sm:text-base">Warranties Approaching Expiration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringSoon.map((p) => {
              const diff = new Date(p.warrantyEndDate) - now;
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              return (
                <div key={p._id} className="bg-white p-3.5 rounded-xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900 truncate max-w-[180px]">{p.productName}</p>
                    <p className="text-xs text-slate-500">{new Date(p.warrantyEndDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                    {days === 0 ? 'Today' : `${days}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Sections: Recent Products & Quick Short-cuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Recently Registered Products</h2>
            <Link to="/products" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No products registered yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Upload an invoice to automatically extract and register your first purchase.</p>
              <Link
                to="/products/add"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload Invoice</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.slice(0, 5).map((p) => (
                <div key={p._id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {p.brand ? p.brand[0] : 'P'}
                    </div>
                    <div>
                      <Link to={`/products/${p._id}`} className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors">
                        {p.productName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {p.category} • {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : 'No purchase date'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">${(p.purchasePrice || 0).toFixed(2)}</p>
                    <span className="text-[11px] text-slate-400">
                      {p.warrantyEndDate ? `Warranty: ${new Date(p.warrantyEndDate).toLocaleDateString()}` : 'No warranty'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg shadow-purple-950/20">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-purple-300" />
            </div>
            <h3 className="font-bold text-lg mb-1">ProofNest AI Assistant</h3>
            <p className="text-xs text-purple-200 leading-relaxed mb-4">
              Ask questions about any of your registered items, warranties, or repair receipts.
            </p>
            <Link
              to="/ai-chat"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-purple-900 font-bold text-xs hover:bg-purple-50 transition-colors"
            >
              <span>Start AI Conversation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <Link to="/documents" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors">
                <span className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Documents Vault</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link to="/calendar" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors">
                <span className="flex items-center space-x-2.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Warranty Calendar</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link to="/repairs" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors">
                <span className="flex items-center space-x-2.5">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <span>Repair History & Costs</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
