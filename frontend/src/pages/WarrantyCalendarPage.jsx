import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Calendar, Bell, AlertTriangle, ShieldCheck, CheckCheck, 
  Clock, ArrowRight, RefreshCw, CheckCircle2
} from 'lucide-react';

export default function WarrantyCalendarPage() {
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, notifRes] = await Promise.all([
        api.get('/products'),
        api.get('/notifications')
      ]);

      if (prodRes.data.success) {
        setProducts(prodRes.data.data.products || []);
      }
      if (notifRes.data.success) {
        setNotifications(notifRes.data.data.notifications || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load calendar data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleRunRemindersCheck = async () => {
    try {
      setRunningCheck(true);
      const res = await api.post('/notifications/trigger-check');
      if (res.data.success) {
        showToast(res.data.message || 'Warranty check completed!', 'success');
        // Refresh notifications
        const notifRes = await api.get('/notifications');
        if (notifRes.data.success) {
          setNotifications(notifRes.data.data.notifications || []);
        }
      }
    } catch (err) {
      showToast('Failed to trigger warranty check', 'error');
    } finally {
      setRunningCheck(false);
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  // Group products with warranties
  const productsWithWarranty = products
    .filter(p => p.warrantyExpiry)
    .map(p => ({ ...p, daysLeft: getDaysLeft(p.warrantyExpiry) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expired = productsWithWarranty.filter(p => p.daysLeft < 0);
  const expiringCritical = productsWithWarranty.filter(p => p.daysLeft >= 0 && p.daysLeft <= 7);
  const expiringSoon = productsWithWarranty.filter(p => p.daysLeft > 7 && p.daysLeft <= 30);
  const safeFuture = productsWithWarranty.filter(p => p.daysLeft > 30);

  const unreadNotifs = notifications.filter(n => !n.isRead);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warranty Calendar & Reminders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Automated milestone alerts at 30, 7, 4, 1, and 0 days prior to expiration
          </p>
        </div>
        <button
          onClick={handleRunRemindersCheck}
          disabled={runningCheck}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${runningCheck ? 'animate-spin' : ''}`} />
          Run Check Now
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Timeline Milestones */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Warranty Milestones Timeline
          </h2>

          {/* Section: Critical (Under 7 Days) */}
          {expiringCritical.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Critical Expirations (Next 7 Days)
              </div>
              <div className="space-y-2">
                {expiringCritical.map(p => (
                  <div key={p._id} className="bg-white p-4 rounded-xl border border-rose-100 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-gray-900">{p.name}</h4>
                      <p className="text-xs text-gray-500">Expires {new Date(p.warrantyExpiry).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                        {p.daysLeft === 0 ? 'Today!' : `${p.daysLeft}d remaining`}
                      </span>
                      <Link to={`/products/${p._id}`} className="text-gray-400 hover:text-gray-700">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Expiring Soon (8 - 30 Days) */}
          {expiringSoon.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                Expiring This Month (8 - 30 Days)
              </div>
              <div className="space-y-2">
                {expiringSoon.map(p => (
                  <div key={p._id} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-gray-900">{p.name}</h4>
                      <p className="text-xs text-gray-500">Expires {new Date(p.warrantyExpiry).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                        {p.daysLeft}d remaining
                      </span>
                      <Link to={`/products/${p._id}`} className="text-gray-400 hover:text-gray-700">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Safe Warranties (> 30 Days) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Active & Protected Warranties
            </div>
            {safeFuture.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No long-term active warranties recorded.</p>
            ) : (
              <div className="space-y-2">
                {safeFuture.map(p => (
                  <div key={p._id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{p.name}</h4>
                      <p className="text-xs text-gray-400">Valid until {new Date(p.warrantyExpiry).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                        {p.daysLeft}d left
                      </span>
                      <Link to={`/products/${p._id}`} className="text-gray-400 hover:text-gray-700">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Expired */}
          {expired.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="text-gray-600 font-bold text-xs uppercase tracking-wider">
                Expired Warranties ({expired.length})
              </div>
              <div className="space-y-2">
                {expired.slice(0, 5).map(p => (
                  <div key={p._id} className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span>Lapsed {Math.abs(p.daysLeft)} days ago</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Notification Center */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {unreadNotifs.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold">
                  {unreadNotifs.length}
                </span>
              )}
            </div>
            {unreadNotifs.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600">No alerts currently</p>
              <p className="text-xs text-gray-400 mt-1">Milestone reminders will appear here</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map(notif => (
                <div 
                  key={notif._id}
                  className={`p-3 rounded-xl border transition ${
                    notif.isRead 
                      ? 'bg-gray-50/50 border-gray-100 text-gray-500' 
                      : 'bg-indigo-50/40 border-indigo-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{notif.message}</p>
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs shrink-0"
                        title="Mark read"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
