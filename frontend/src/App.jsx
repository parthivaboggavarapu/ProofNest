import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/common/RouteGuards';
import { MainLayout } from './layouts/MainLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AddProductPage from './pages/AddProductPage';
import DocumentsPage from './pages/DocumentsPage';
import WarrantyCalendarPage from './pages/WarrantyCalendarPage';
import RepairsPage from './pages/RepairsPage';
import AiChatPage from './pages/AiChatPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes (Guests only, redirects to /dashboard if logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<AddProductPage />} />
                <Route path="/products/add" element={<AddProductPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/calendar" element={<WarrantyCalendarPage />} />
                <Route path="/repairs" element={<RepairsPage />} />
                <Route path="/ai-chat" element={<AiChatPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
