import React from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Features from './pages/Features'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Payment from './pages/Payment'
import InvoiceDetail from './pages/InvoiceDetail'
import ManageApps from './pages/ManageApps'
import Docs from './pages/Docs'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import AdminRoute from './components/AdminRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminBookings from './pages/admin/AdminBookings'
import AdminUsers from './pages/admin/AdminUsers'
import AdminInstallations from './pages/admin/AdminInstallations'
import AdminInstallationDetail from './pages/admin/AdminInstallationDetail'
import AdminInstallationCreate from './pages/admin/AdminInstallationCreate'
import AdminPayments from './pages/admin/AdminPayments'
import AdminInvoiceDetail from './pages/admin/AdminInvoiceDetail'
import AdminBookingDetail from './pages/admin/AdminBookingDetail'
import AdminSettings from './pages/admin/AdminSettings'
import OAuthCallback from './pages/OAuthCallback'

const Layout = ({ children }) => {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <img src="/images/logo.png" alt="SMOOD" className="brand-logo" />
            SMOOD VFX
          </Link>
          <nav className="nav-links">
            {isAuthenticated ? (
              isAdmin ? (
                <>
                  <Link to="/admin" className="nav-link">Overview</Link>
                  <Link to="/admin/payments" className="nav-link">Payments</Link>
                  <Link to="/admin/settings" className="nav-link">Settings</Link>
                  <Link to="/admin/bookings" className="nav-link">Bookings</Link>
                  <Link to="/admin/users" className="nav-link">Users</Link>
                  <Link to="/admin/installations" className="nav-link">Installations</Link>
                  <button className="nav-link" onClick={handleLogout} style={{ background: 'transparent' }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/client/payment" className="nav-link">Payment</Link>
                  <Link to="/client/apps" className="nav-link">Manage Apps</Link>
                  <Link to="/client/docs" className="nav-link">Docs</Link>
                  <button className="nav-link" onClick={handleLogout} style={{ background: 'transparent' }}>Logout</button>
                </>
              )
            ) : (
              <>
                <Link to="/features" className="nav-link">Features</Link>
                <Link to="/pricing" className="nav-link">Pricing</Link>
                <Link to="/contact" className="nav-link">Contact</Link>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/signup" className="nav-link">Signup</Link>
                <Link to="/booking" className="btn btn-primary">Booking</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        {children}
      </main>
      <footer className="footer">
        © {new Date().getFullYear()} SMOOD — All rights reserved
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AdminRoute>
              <AdminPayments />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments/:id"
          element={
            <AdminRoute>
              <AdminInvoiceDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings/:id"
          element={
            <AdminRoute>
              <AdminBookingDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/installations"
          element={
            <AdminRoute>
              <AdminInstallations />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/installations/new"
          element={
            <AdminRoute>
              <AdminInstallationCreate />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/installations/:id"
          element={
            <AdminRoute>
              <AdminInstallationDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/client/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/payment/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/apps"
          element={
            <ProtectedRoute>
              <ManageApps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/docs"
          element={
            <ProtectedRoute>
              <Docs />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
