import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, FileText, Calendar, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">ProofNest</span>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 lg:py-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Assisted Personal Asset & Warranty Organizer</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Every Purchase, <span className="text-blue-600">Safely Organized.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Stop digging through email receipts and lost paper bills. ProofNest connects your products, warranties, return windows, invoices, and repair records into one intelligent dashboard.
          </p>

          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            "One Product. One Place. Complete History."
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Create Free Account'}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-slate-700 border border-slate-300 font-semibold text-base hover:bg-slate-50 shadow-sm transition-all"
            >
              Existing Member Sign In
            </Link>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything You Need for Peace of Mind</h2>
              <p className="mt-3 text-slate-600 text-sm">Automated extraction, lifetime warranty reminders, and an AI that answers questions about your own documents.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Smart OCR Extraction</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Drop in an invoice PDF or image. ProofNest automatically extracts product name, brand, purchase date, price, and warranty details.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-5">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Deadline Reminders</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Automatic reminders at 30, 7, 4, and 1 day before warranties expire or return windows close. Never miss an eligible claim.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-5">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Repair & Cost Tracker</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Keep a chronological service history for every appliance and gadget. Track lifetime maintenance costs and link service bills.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Grounded AI Assistant</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Ask "When does my laptop warranty end?" or "What was my phone repair cost?" and receive verified answers with source citations.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 ProofNest. All rights reserved. Full-Stack Prototype.</p>
          <div className="flex space-x-6">
            <span>JWT Security</span>
            <span>GridFS Storage</span>
            <span>Local OCR</span>
            <span>RAG AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
