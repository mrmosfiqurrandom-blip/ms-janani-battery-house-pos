/**
 * VoltPulse POS & Business ERP - Domain TypeScript Data Models
 * Clean abstraction ready for Firebase Firestore / Cloud Functions in Step 2.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface BuybackRecord {
  id: string;
  saleId?: string;
  invoiceNo?: string;
  customerId?: string;
  customerName?: string;
  batteryType: string;
  brand: string;
  capacityAh: string;
  condition: 'GOOD' | 'SCRAP' | 'FAULTY';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'IN_STOCK' | 'SOLD' | 'SCRAPPED';
  date: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  partyName: string;
  date: string;
  amount: number;
  accountId: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type ProductType =
  | 'Battery'
  | 'IPS'
  | 'IPS Battery'
  | 'Inverter'
  | 'Charger'
  | 'Solar Product'
  | 'Car Parts'
  | 'Motorcycle Parts'
  | 'Electrical'
  | 'Electronics'
  | 'Accessories'
  | 'Other';

export interface Brand {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Unit {
  id: string;
  name: string;
  shortName: string;
  allowDecimal: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  subcategory?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minSellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  productType: ProductType;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  openingBalance: number;
  creditLimit: number;
  currentDue: number;
  totalPurchased: number;
  totalPaid: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  openingBalance: number;
  creditLimit: number;
  currentDue: number; // Purchase Payable
  totalPurchased: number;
  totalPaid: number;
  commissionEarnedTotal?: number;
  commissionDueTotal?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface OldBatteryBuyback {
  id?: string;
  batteryType: string;
  brand: string;
  capacityAh: string; // e.g., "100Ah", "150Ah"
  condition: 'GOOD' | 'SCRAP' | 'FAULTY';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export type SaleStatus = 'Active' | 'Paid' | 'Partial' | 'Due' | 'Cancelled' | 'Voided';

export type PaymentMethod = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'OTHER';

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  
  // Financial breakdown
  grossSale: number;
  salesDiscount: number;
  oldBatteryBuybackAmount: number;
  oldBatteryBuybacks?: OldBatteryBuyback[];
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  
  paymentMethod: PaymentMethod;
  accountId: string;
  status: SaleStatus;
  createdBy: string;
  notes?: string;
  createdAt: string;
  voidReason?: string;
}

export type PurchaseStatus = 'RECEIVED' | 'PARTIAL' | 'PENDING' | 'CANCELLED';

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  purchaseCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  status: PurchaseStatus;
  notes?: string;
  createdAt: string;
}

export type OldBatteryStatus = 'IN_STOCK' | 'SOLD' | 'SCRAPPED' | 'RETURNED' | 'OTHER';

export interface OldBatteryStock {
  id: string;
  code: string;
  type: string;
  brand: string;
  capacityAh: string;
  buybackDate: string;
  buybackPrice: number;
  status: OldBatteryStatus;
  sourceCustomerId: string;
  sourceCustomerName: string;
  sourceInvoiceNo: string;
  saleDisposalDate?: string;
  saleDisposalValue?: number;
  profitLoss?: number;
  notes?: string;
}

export type CommissionStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface SupplierCommission {
  id: string;
  supplierId: string;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  eligiblePurchaseAmount: number;
  commissionRate: number; // Percentage, e.g. 3%
  commissionAmount: number;
  receivedAmount: number;
  dueAmount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  status: CommissionStatus;
  notes?: string;
}

export interface CustomerPayment {
  id: string;
  paymentNo: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  accountId: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  accountId: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Salary'
  | 'Transport'
  | 'Repair'
  | 'Maintenance'
  | 'Delivery'
  | 'Marketing'
  | 'Bank Charge'
  | 'Mobile/Phone'
  | 'Office Expense'
  | 'Other';

export interface Expense {
  id: string;
  expenseNo: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  accountId: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type AccountType = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountNumber?: string;
  balance: number;
  totalIn: number;
  totalOut: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  type: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: number;
  balanceAfter: number;
  reference: string;
  category: string;
  description: string;
}

export interface AccountTransfer {
  id: string;
  transferNo: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'OPENING'
  | 'OTHER';

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  reference: string;
  notes?: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  saleInvoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  accountId: string;
  reason: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  purchaseInvoiceNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  returnAmount: number;
  reason: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'CANCEL'
  | 'VOID'
  | 'PAYMENT'
  | 'STOCK_ADJUSTMENT'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  module: string;
  recordId: string;
  description: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  invoiceFooter: string;
  invoicePrefix: string;
  invoiceStartingNumber: number;
  showLogoOnInvoice: boolean;
  showCustomerAddress: boolean;
  receiptSize: 'A4' | 'POS_80MM';
  currency: string;
  currencySymbol: string;
  enableTax: boolean;
  defaultTaxRate: number;
  lowStockThreshold: number;
  barcodeAutoPrint: boolean;
}
