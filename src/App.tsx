import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { MainLayout } from './layouts/MainLayout';

// RoleGuard component
const RoleGuard: React.FC<{ minRole: 'ADMIN' | 'MANAGER'; children: React.ReactNode }> = ({
  minRole,
  children,
}) => {
  const { role } = useAuth();
  if (role === 'CASHIER') {
    return <Navigate to="/pos" replace />;
  }
  if (minRole === 'ADMIN' && role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { SalesReturnsPage } from './pages/SalesReturnsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { NewPurchasePage } from './pages/NewPurchasePage';
import { PurchaseReturnsPage } from './pages/PurchaseReturnsPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { OldBatteriesPage } from './pages/OldBatteriesPage';
import { CatalogMetaPage } from './pages/CatalogMetaPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerPaymentsPage } from './pages/CustomerPaymentsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SupplierCommissionPage } from './pages/SupplierCommissionPage';
import { SupplierPaymentsPage } from './pages/SupplierPaymentsPage';
import { AccountsPage } from './pages/AccountsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ProfitLossPage } from './pages/ProfitLossPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="sales-history" element={<SalesHistoryPage />} />
              <Route path="sales-returns" element={<SalesReturnsPage />} />

              {/* Purchasing (Manager / Admin only) */}
              <Route
                path="purchases"
                element={
                  <RoleGuard minRole="MANAGER">
                    <PurchasesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="purchases/new"
                element={
                  <RoleGuard minRole="MANAGER">
                    <NewPurchasePage />
                  </RoleGuard>
                }
              />
              <Route
                path="purchase-returns"
                element={
                  <RoleGuard minRole="MANAGER">
                    <PurchaseReturnsPage />
                  </RoleGuard>
                }
              />

              <Route path="inventory/products" element={<ProductsPage />} />
              <Route path="inventory/stock" element={<StockPage />} />
              <Route path="inventory/old-batteries" element={<OldBatteriesPage />} />
              <Route
                path="inventory/catalog-meta"
                element={
                  <RoleGuard minRole="MANAGER">
                    <CatalogMetaPage />
                  </RoleGuard>
                }
              />

              <Route path="customers" element={<CustomersPage />} />
              <Route path="customer-payments" element={<CustomerPaymentsPage />} />

              <Route
                path="suppliers"
                element={
                  <RoleGuard minRole="MANAGER">
                    <SuppliersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="supplier-commission"
                element={
                  <RoleGuard minRole="MANAGER">
                    <SupplierCommissionPage />
                  </RoleGuard>
                }
              />
              <Route
                path="supplier-payments"
                element={
                  <RoleGuard minRole="MANAGER">
                    <SupplierPaymentsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="accounts"
                element={
                  <RoleGuard minRole="MANAGER">
                    <AccountsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="expenses"
                element={
                  <RoleGuard minRole="MANAGER">
                    <ExpensesPage />
                  </RoleGuard>
                }
              />

              {/* Reports (Manager / Admin only - Cashier strictly blocked) */}
              <Route
                path="reports"
                element={
                  <RoleGuard minRole="MANAGER">
                    <ReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="reports/profit-loss"
                element={
                  <RoleGuard minRole="MANAGER">
                    <ProfitLossPage />
                  </RoleGuard>
                }
              />

              {/* Admin only */}
              <Route
                path="audit-logs"
                element={
                  <RoleGuard minRole="ADMIN">
                    <AuditLogsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="settings"
                element={
                  <RoleGuard minRole="ADMIN">
                    <SettingsPage />
                  </RoleGuard>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
