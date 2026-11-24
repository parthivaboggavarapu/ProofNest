import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Wrench, Plus, DollarSign, CheckCircle2, Clock, 
  AlertCircle, Trash2, Tag, Calendar, Building
} from 'lucide-react';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    productId: '',
    issue: '',
    description: '',
    status: 'requested',
    repairCost: '',
    repairDate: new Date().toISOString().split('T')[0],
    technicianOrCenter: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [repRes, prodRes] = await Promise.all([
        api.get('/repairs'),
        api.get('/products')
      ]);

      if (repRes.data.success) {
        setRepairs(repRes.data.data.repairs || []);
      }
      if (prodRes.data.success) {
        setProducts(prodRes.data.data.products || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load repairs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRepair = async (e) => {
    e.preventDefault();
    if (!form.productId) {
      showToast('Please select a product', 'error');
      return;
    }
    if (!form.issue) {
      showToast('Please specify the issue', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/repairs', {
        ...form,
        repairCost: form.repairCost ? parseFloat(form.repairCost) : 0
      });

      if (res.data.success) {
        showToast('Repair logged successfully!', 'success');
        setShowModal(false);
        setForm({
          productId: '',
          issue: '',
          description: '',
          status: 'requested',
          repairCost: '',
          repairDate: new Date().toISOString().split('T')[0],
          technicianOrCenter: '',
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log repair', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this repair record?')) return;
    try {
      await api.delete(`/repairs/${id}`);
      showToast('Repair record deleted', 'success');
      setRepairs(repairs.filter(r => r._id !== id));
    } catch (err) {
      showToast('Failed to delete repair', 'error');
    }
  };

  const filteredRepairs = repairs.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const totalCost = repairs.reduce((acc, curr) => acc + (curr.repairCost || 0), 0);
  const completedCount = repairs.filter(r => r.status === 'completed').length;
  const inProgressCount = repairs.filter(r => r.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair History & Maintenance</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track service visits, component replacements, warranty claims, and total costs
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Log New Repair
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Repairs</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{repairs.length}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-amber-600 uppercase">In Progress</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{inProgressCount}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Completed</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{completedCount}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-indigo-600 uppercase">Total Spent</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'requested', 'in_progress', 'completed', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Repair List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
          ))}
        </div>
      ) : filteredRepairs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-md mx-auto shadow-sm">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No repair logs found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Log your repair work and service receipts to maintain comprehensive product history.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
          >
            Log First Repair
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRepairs.map(repair => {
            let badgeBg = 'bg-gray-100 text-gray-700 border-gray-200';
            if (repair.status === 'completed') badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (repair.status === 'in_progress') badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
            if (repair.status === 'rejected') badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <div 
                key={repair._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${badgeBg}`}>
                      {repair.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {repair.repairDate ? new Date(repair.repairDate).toLocaleDateString() : 'No date'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900">{repair.issue}</h3>
                  <p className="text-xs text-indigo-600 font-semibold">
                    Product: {repair.product?.name || 'Unknown Product'}
                  </p>

                  {repair.description && (
                    <p className="text-xs text-gray-600 max-w-xl">{repair.description}</p>
                  )}

                  {repair.technicianOrCenter && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      Center: {repair.technicianOrCenter}
                    </p>
                  )}
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-medium">Cost</span>
                    <span className="text-lg font-bold text-gray-900">
                      {repair.repairCost ? `$${repair.repairCost.toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(repair._id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition mt-2"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Repair Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Log Maintenance / Repair</h3>
            <form onSubmit={handleCreateRepair} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Select Product *</label>
                <select
                  required
                  value={form.productId}
                  onChange={e => setForm({ ...form, productId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} {p.brand ? `(${p.brand})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Issue / Defect *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Display backlight flicker"
                  value={form.issue}
                  onChange={e => setForm({ ...form, issue: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Repair Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.repairCost}
                    onChange={e => setForm({ ...form, repairCost: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Date</label>
                  <input
                    type="date"
                    value={form.repairDate}
                    onChange={e => setForm({ ...form, repairDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Service Center</label>
                  <input
                    type="text"
                    placeholder="e.g. Authorized Store"
                    value={form.technicianOrCenter}
                    onChange={e => setForm({ ...form, technicianOrCenter: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Description & Notes</label>
                <textarea
                  rows="3"
                  placeholder="Details of fix or warranty resolution..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Repair'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
