# VoltPulse POS & Hardware ERP (Step 2 — Firebase Integration)

**Electronics Hardware Shop POS & Business Management System** featuring **Firebase Authentication**, **Cloud Firestore**, **Firebase Security Rules**, and **Cloud Functions** for atomic financial transactions.

---

## 1. Project Structure

```text
/
├── index.html                  # HTML entry point with Plus Jakarta Sans & JetBrains Mono
├── metadata.json               # Applet title and description configuration
├── package.json                # Dependencies: React 19, TypeScript, Tailwind v4, Lucide, Firebase
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
├── firebase.json               # Firebase deployment configuration (Firestore, Functions, Hosting)
├── .firebaserc                 # Firebase project target definition
├── firestore.rules             # Hardened Zero-Trust Firestore Security Rules (RBAC)
├── firestore.indexes.json      # Optimized compound queries
├── storage.rules               # Asset and upload security constraints
├── firebase-blueprint.json     # Declarative data model & collection paths
├── firebase-applet-config.json # Provisioned client credentials
├── README.md                   # Full architecture and deployment guide
├── backend/
│   └── functions/              # Firebase Cloud Functions (TypeScript)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts        # Atomic createSale, createPurchase, transferAccount
└── src/
    ├── lib/
    │   └── firebase.ts         # Firebase app, auth, db, & handleFirestoreError
    ├── types/                  # Domain TypeScript interfaces
    │   └── index.ts
    ├── services/               # Firestore-backed service modules with fallback
    │   ├── authService.ts
    │   ├── productService.ts
    │   ├── customerService.ts
    │   ├── supplierService.ts
    │   ├── salesService.ts
    │   ├── purchaseService.ts
    │   ├── inventoryService.ts
    │   ├── oldBatteryService.ts
    │   ├── paymentService.ts
    │   ├── commissionService.ts
    │   ├── expenseService.ts
    │   ├── accountService.ts
    │   ├── returnsService.ts
    │   ├── reportService.ts
    │   ├── auditService.ts
    │   ├── settingsService.ts
    │   └── seedService.ts
    ├── data/
    │   └── mockData.ts         # Realistic Bangladeshi hardware shop mock dataset (BDT currency)
    ├── context/
    │   ├── AuthContext.tsx     # Firebase Auth listener & live role switcher
    │   └── ToastContext.tsx    # Toast notifications
    ├── layouts/
    │   └── MainLayout.tsx      # Sidebar, top header, & Sync Firestore action
    ├── components/
    │   ├── InvoiceModal.tsx    # Print-ready A4 & compact 80mm thermal receipt generator
    │   ├── ConfirmationModal.tsx # Financial safety confirmation with audit reasoning
    │   ├── StatusBadge.tsx     # Clean unboxed status indicators
    │   └── EmptyState.tsx      # Domain-native empty state indicators
    ├── utils/
    │   └── formatters.ts       # BDT currency (৳), date, time & tabular figures
    ├── pages/                  # Preserved frontend pages connected to Firebase
    │   ├── DashboardPage.tsx
    │   ├── POSPage.tsx         # POS terminal with Old Battery Buyback & Acceptance preset
    │   ├── SalesHistoryPage.tsx
    │   ├── SalesReturnsPage.tsx
    │   ├── PurchasesPage.tsx
    │   ├── NewPurchasePage.tsx
    │   ├── PurchaseReturnsPage.tsx
    │   ├── ProductsPage.tsx
    │   ├── StockPage.tsx
    │   ├── OldBatteriesPage.tsx
    │   ├── CatalogMetaPage.tsx
    │   ├── CustomersPage.tsx
    │   ├── CustomerPaymentsPage.tsx
    │   ├── SuppliersPage.tsx
    │   ├── SupplierCommissionPage.tsx
    │   ├── SupplierPaymentsPage.tsx
    │   ├── AccountsPage.tsx
    │   ├── ExpensesPage.tsx
    │   ├── ProfitLossPage.tsx
    │   ├── ReportsPage.tsx
    │   ├── AuditLogsPage.tsx
    │   └── SettingsPage.tsx
    ├── App.tsx
    ├── main.tsx
    └── index.css
```

---

## 2. Firebase Services Used

* **Firebase Authentication**: Session management, Google Sign-in / Email provider, and role extraction (`ADMIN`, `MANAGER`, `CASHIER`).
* **Cloud Firestore**: Persistent document store with Zero-Trust security rules and atomic transactions for financial integrity.
* **Firebase Cloud Functions**: Server-side HTTPS callable functions executing multi-document operations (`createSale`, `createPurchase`, `transferAccount`).
* **Firebase Storage**: Secure object bucket for product images and shop invoice logos.

---

## 3. Firestore Collections

1. `users`: User profiles with `uid`, `name`, `email`, `role`, and `status`.
2. `products`: Catalog items with wholesale purchase prices, retail prices, and inventory stock balances.
3. `brands`: Manufacturer taxonomy (Rahimafrooz, Hamko, Lucas, Exide, Walton).
4. `categories`: Classification taxonomy (Battery, IPS & Inverter, Cables, Automotive).
5. `units`: Units of measure (Piece, Set, Meter, Box).
6. `customers`: Customer records, credit limits, and outstanding accounts receivable.
7. `suppliers`: Vendor records and purchase payable liabilities.
8. `sales`: Retail invoices with strict Old Battery Buyback credit separation.
9. `saleItems`: Line item snapshots preserving historical pricing.
10. `oldBatteryBuybacks`: Individual recycled battery buyback transactions.
11. `oldBatteryStock`: Secondary inventory pool tracking scrap lead batteries.
12. `purchases`: Supplier purchase orders and incoming inventory consignments.
13. `purchaseItems`: Consignment items with wholesale cost records.
14. `customerPayments`: Due collection vouchers.
15. `supplierPayments`: Vendor payable disbursement vouchers.
16. `supplierCommissions`: Manufacturer sales turnover rebates (separated from payables).
17. `commissionPayments`: Incentive deposits received from suppliers.
18. `accounts`: Liquid repositories (Cash Drawer, City Bank, bKash, Nagad).
19. `accountTransactions`: Ledger transaction lines with balance after.
20. `accountTransfers`: Inter-account liquidity shifts (neutral non-expense).
21. `stockMovements`: Physical inventory movement audit log (`SALE`, `PURCHASE`, `RETURN`, `ADJUSTMENT`).
22. `salesReturns`: Customer returns and refunds.
23. `purchaseReturns`: Factory defect returns and credit notes.
24. `auditLogs`: Forensic audit logs recording actions, user identity, and terminal IP.
25. `settings`: Store configuration, invoice prefix, and receipt sizes.

---

## 4. Cloud Functions Created (`backend/functions/src/index.ts`)

* `createSale`: Executes an atomic multi-document Firestore transaction:
  * Validates product stock and selling prices.
  * Calculates Gross Sale, Sales Discount, Old Battery Buyback Amount, Net Customer Receivable.
  * Writes the `sales` document and item snapshots.
  * Registers customer exchange battery in `oldBatteryStock`.
  * Decrements product warehouse stock and records `stockMovements`.
  * If cash/bank received, credits `accounts` balance and creates an `accountTransactions` record.
  * If credit due exists, updates `customers.currentDue`.
  * Writes forensic `auditLogs` entry.
* `createPurchase`: Atomically receives inventory consignments, increments warehouse stock, writes `stockMovements`, and updates vendor accounts payable.
* `transferAccount`: Moves funds between two accounts (e.g., Cash Drawer ➔ City Bank Current A/C) without affecting business income or expenses.

---

## 5. Security Rules Summary (`firestore.rules`)

* **Deny-by-default**: Root `match /{document=**}` denies all unauthorized reads and writes.
* **Role-Based Access Control (RBAC)**:
  * `ADMIN`: Full access to settings, user management, audit logs, and voiding transactions.
  * `MANAGER`: Can manage products, purchases, suppliers, expenses, and view financial statements.
  * `CASHIER`: Can register sales, receive customer payments, and view inventory balances.
* **Immutability of Financial Transactions**: Completed sales, account transactions, and stock movements can never be deleted from client SDKs.
* **Relational Validation**: Ensures all foreign keys (`customerId`, `productId`, `accountId`) correspond to real documents.

---

## 6. Authentication Setup

* Integrates `firebase/auth` using Google Sign-in popup and persistent listener (`onAuthStateChanged`).
* Bootstraps the user email as `ADMIN` in `users/{userId}`.
* Role-switching simulation is preserved in the navigation bar to allow instant preview testing across `ADMIN`, `MANAGER`, and `CASHIER` views.

---

## 7. Storage Setup (`storage.rules`)

* Restricts file size to $< 5\text{MB}$ for product images and $< 2\text{MB}$ for store logos.
* Enforces `image/*` MIME type validation and authenticated write permissions.

---

## 8. Required Firestore Indexes (`firestore.indexes.json`)

* Compound query index on `sales` (`status` ASC, `date` DESC).
* Compound query index on `sales` (`customerId` ASC, `date` DESC).
* Compound query index on `purchases` (`supplierId` ASC, `date` DESC).
* Compound query index on `stockMovements` (`productId` ASC, `date` DESC).
* Compound query index on `oldBatteryStock` (`status` ASC, `buybackDate` DESC).
* Compound query index on `supplierCommissions` (`status` ASC, `periodStart` DESC).

---

## 9. Environment Variables (`.env.example`)

```bash
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="gen-lang-client-0747337845.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="gen-lang-client-0747337845"
VITE_FIREBASE_STORAGE_BUCKET="gen-lang-client-0747337845.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="185035989801"
VITE_FIREBASE_APP_ID="1:185035989801:web:ab95cdb97c229a636dcd38"
```

---

## 10. Local Development & Seeding

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Seed Firestore Database with Demo Records
# Click the "Sync Firestore" button in the top navigation bar, or run:
# seedService.seedAllData()
```

---

## 11. Mandatory Acceptance Tests Verified

### Test 1: Old Battery Buyback
* **New Battery Sale**: ৳20,000 (Hamko IPS Battery 100Ah)
* **Old Battery Buyback**: ৳5,000 (Lucas 100Ah Old Battery)
* **Customer Payment**: ৳15,000
* **Verification**:
  * Sales Revenue = ৳20,000
  * Sales Discount = ৳0
  * Old Battery Buyback = ৳5,000
  * Net Payable = ৳15,000
  * Paid = ৳15,000
  * Customer Due = ৳0

### Test 2: Supplier Commission & Rebate
* **Supplier**: Rahimafrooz Distribution Ltd
* **Eligible Purchase Turnover**: ৳500,000
* **Commission Rate**: 3.0%
* **Verification**:
  * Commission Earned = ৳15,000
  * Commission Received = ৳10,000
  * Commission Due = ৳5,000
  * **Strictly separated from Supplier Purchase Payable!**
