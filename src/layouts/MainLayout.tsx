import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { seedService } from '../services/seedService';
import { auth } from '../lib/firebase';
import { UserRole } from '../types';
import { AuthModal } from '../components/AuthModal';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  RotateCcw,
  ShoppingBag,
  Package,
  Layers,
  BatteryCharging,
  Users,
  Building2,
  DollarSign,
  Receipt,
  Wallet,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Settings,
  Menu,
  X,
  CreditCard,
  Zap,
  Database,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { role, switchRole, user, logout } = useAuth();
  const { success, error, info } = useToast();
  const location = useLocation();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchRole(e.target.value as UserRole);
  };

  const handleSeedDatabase = async () => {
    // If not signed in to Firebase Auth, prompt user to sign in
    if (!auth.currentUser) {
      setShowAuthModal(true);
      info('Login Required', 'Please sign in with Firebase Staff credentials or 1-Click Demo Login to sync data.');
      return;
    }

    setIsSeeding(true);
    info('Database Syncing', 'Writing initial products, customer ledgers & acceptance test data to Firestore...');
    try {
      const res = await seedService.seedAllData(auth.currentUser.email || user?.email);
      if (res.success) {
        success('Database Seeded', res.message);
      } else {
        error('Sync Notice', res.message);
      }
    } catch (err: any) {
      error('Seed Error', 'Failed to seed database. Insufficient permissions or network error.');
    } finally {
      setIsSeeding(false);
    }
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
      isActive
        ? 'bg-amber-500/15 text-amber-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* ================= DESKTOP & MOBILE SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">
                VoltPulse ERP
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Hardware POS & Firebase
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
          {/* Main */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Overview
            </div>
            <div className="space-y-0.5">
              <NavLink to="/" end className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
            </div>
          </div>

          {/* POS & Sales Module */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              POS & Sales
            </div>
            <div className="space-y-0.5">
              <NavLink to="/pos" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-700">POS Terminal</span>
              </NavLink>
              <NavLink to="/sales-history" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <History className="w-4 h-4" />
                <span>Sales Invoices</span>
              </NavLink>
              <NavLink to="/sales-returns" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <RotateCcw className="w-4 h-4" />
                <span>Sales Returns</span>
              </NavLink>
            </div>
          </div>

          {/* Purchases Module (Manager / Admin) */}
          {role !== 'CASHIER' && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Purchasing
              </div>
              <div className="space-y-0.5">
                <NavLink to="/purchases/new" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <ShoppingBag className="w-4 h-4" />
                  <span>New Purchase</span>
                </NavLink>
                <NavLink to="/purchases" end className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <History className="w-4 h-4" />
                  <span>Purchase History</span>
                </NavLink>
                <NavLink to="/purchase-returns" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <RotateCcw className="w-4 h-4" />
                  <span>Purchase Returns</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Inventory & Special Old Battery Module */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inventory & Recycling
            </div>
            <div className="space-y-0.5">
              <NavLink to="/inventory/products" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <Package className="w-4 h-4" />
                <span>Products Catalog</span>
              </NavLink>
              <NavLink to="/inventory/stock" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <Layers className="w-4 h-4" />
                <span>Stock Ledger</span>
              </NavLink>
              <NavLink to="/inventory/old-batteries" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <BatteryCharging className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-rose-700">Old Battery Stock</span>
              </NavLink>
              {role !== 'CASHIER' && (
                <NavLink to="/inventory/catalog-meta" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <Settings className="w-4 h-4" />
                  <span>Brands & Categories</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* Parties */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Parties & Ledgers
            </div>
            <div className="space-y-0.5">
              <NavLink to="/customers" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </NavLink>
              <NavLink to="/customer-payments" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                <CreditCard className="w-4 h-4" />
                <span>Customer Payments</span>
              </NavLink>
              {role !== 'CASHIER' && (
                <>
                  <NavLink to="/suppliers" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                    <Building2 className="w-4 h-4" />
                    <span>Suppliers</span>
                  </NavLink>
                  <NavLink to="/supplier-commission" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">Supplier Commission</span>
                  </NavLink>
                  <NavLink to="/supplier-payments" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                    <CreditCard className="w-4 h-4" />
                    <span>Supplier Payments</span>
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Finance & Accounts */}
          {role !== 'CASHIER' && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Finance & Banking
              </div>
              <div className="space-y-0.5">
                <NavLink to="/accounts" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <Wallet className="w-4 h-4" />
                  <span>Accounts & Cash</span>
                </NavLink>
                <NavLink to="/expenses" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <Receipt className="w-4 h-4" />
                  <span>Expenses</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Financial Reports */}
          {role !== 'CASHIER' && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Financial Reports
              </div>
              <div className="space-y-0.5">
                <NavLink to="/reports/profit-loss" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span className="font-semibold text-emerald-800">Profit & Loss (P&L)</span>
                </NavLink>
                <NavLink to="/reports" end className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <BarChart3 className="w-4 h-4" />
                  <span>Business Reports</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Administration (Admin only) */}
          {role === 'ADMIN' && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </div>
              <div className="space-y-0.5">
                <NavLink to="/audit-logs" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>
                <NavLink to="/settings" className={navLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  <Settings className="w-4 h-4" />
                  <span>Shop Settings</span>
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {auth.currentUser ? 'Google Connected' : `${user?.role} · Local Demo`}
                </p>
              </div>
            </div>
            {auth.currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"
                  title="Switch Staff Account"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors shadow-2xs cursor-pointer"
                title="Sign in with Email or 1-Click Demo accounts"
              >
                <LogIn className="w-3 h-3" />
                <span>Staff Login</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ================= MAIN CONTENT VIEWPORT ================= */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">VoltPulse POS</span>
              <span>/</span>
              <span className="capitalize">
                {location.pathname === '/'
                  ? 'Dashboard'
                  : location.pathname.replace(/^\//, '').replace(/\//g, ' · ')}
              </span>
            </div>
          </div>

          {/* Top Actions: Database Sync, Role Switcher & Direct POS Terminal Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seed / Sync Firebase button */}
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
              title="Seed Firestore with demo hardware data and Acceptance Test records"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">
                {isSeeding ? 'Syncing...' : 'Sync Firestore'}
              </span>
            </button>

            {/* Quick Role Switcher Simulation */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Role:</span>
              <select
                value={role}
                onChange={handleRoleChange}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="CASHIER">CASHIER</option>
              </select>
            </div>

            <NavLink
              to="/pos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="font-semibold">Open POS</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Staff Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
