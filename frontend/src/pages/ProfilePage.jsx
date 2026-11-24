import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  User, Shield, Lock, LogOut, CheckCircle, Database, 
  Server, KeyRound, Clock
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logoutAll, logout } = useAuth();
  const { showToast } = useToast();

  const handleLogoutAll = async () => {
    if (!window.confirm('This will invalidate all active sessions and refresh tokens on all devices. Continue?')) return;
    try {
      await logoutAll();
      showToast('Logged out of all devices', 'success');
    } catch (err) {
      showToast('Failed to logout of all devices', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account & Security</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your ProofNest profile, credentials, and active authentication sessions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: User Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <span className="inline-block mt-2 px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider bg-indigo-50 text-indigo-700">
              Role: {user?.role || 'User'}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Account ID:</span>
              <span className="font-mono text-gray-700 truncate max-w-[120px]">{user?._id || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Security Mode:</span>
              <span className="font-semibold text-emerald-600">JWT + Rotating Tokens</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Right Column: Security Architecture & Actions */}
        <div className="md:col-span-2 space-y-6">
          
          {/* JWT Security Status Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Active JWT Architecture</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              ProofNest uses state-of-the-art token security. Access tokens are kept exclusively in client memory 
              (15-minute expiration) and refreshed via HttpOnly, SameSite cookies with SHA-256 hashed refresh token rotation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-gray-400 block font-medium">Database Cluster</span>
                <span className="font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  ProofNestCluster (Atlas)
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-gray-400 block font-medium">Token Storage</span>
                <span className="font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  In-Memory + HttpOnly
                </span>
              </div>
            </div>
          </div>

          {/* Session Management */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Session Controls</h3>
            <p className="text-xs text-gray-500">
              If you suspect unauthorized access or lost a device, you can revoke all refresh token families immediately.
            </p>

            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-rose-900">Revoke All Devices</h4>
                <p className="text-xs text-rose-700 mt-0.5">Invalidate all existing session tokens in MongoDB</p>
              </div>
              <button
                onClick={handleLogoutAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shrink-0"
              >
                Logout All Sessions
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
