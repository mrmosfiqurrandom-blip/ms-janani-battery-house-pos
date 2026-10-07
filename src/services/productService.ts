import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Brand, Category, Unit } from '../types';

export const productService = {
  // Real-time listener for products
  subscribeProducts(
    callback: (products: Product[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        })) as Product[];
        callback(products);
      },
      (error) => {
        console.error('Products listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getProducts(): Promise<Product[]> {
    try {
      const snap = await getDocs(query(collection(db, 'products'), orderBy('name', 'asc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  },

  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as any) } as Product;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `products/${id}`);
    }
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const id = `prd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newProduct: Product = { ...product, id };

    try {
      await setDoc(doc(db, 'products', id), {
        ...newProduct,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newProduct;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${id}`);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      await updateDoc(doc(db, 'products', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      const updated = await this.getProduct(id);
      return updated!;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  },

  // Categories
  subscribeCategories(
    callback: (categories: Category[]) => void,
    onError?: (error: Error) => void
  ) {
    return onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const categories = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Category[];
        callback(categories);
      },
      (error) => {
        console.error('Categories listener error:', error);
        if (onError) onError(error);
      }
    );
  },

  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Category[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const id = `cat-${Date.now()}`;
    const newCat: Category = { ...category, id };
    try {
      await setDoc(doc(db, 'categories', id), newCat);
      return newCat;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `categories/${id}`);
    }
  },

  // Brands
  subscribeBrands(callback: (brands: Brand[]) => void) {
    return onSnapshot(collection(db, 'brands'), (snap) => {
      const brands = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Brand[];
      callback(brands);
    });
  },

  async getBrands(): Promise<Brand[]> {
    try {
      const snap = await getDocs(collection(db, 'brands'));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Brand[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'brands');
    }
  },

  async createBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const id = `br-${Date.now()}`;
    const newBrand: Brand = { ...brand, id };
    try {
      await setDoc(doc(db, 'brands', id), newBrand);
      return newBrand;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `brands/${id}`);
    }
  },

  // Units
  subscribeUnits(callback: (units: Unit[]) => void) {
    return onSnapshot(collection(db, 'units'), (snap) => {
      const units = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Unit[];
      callback(units);
    });
  },

  async getUnits(): Promise<Unit[]> {
    try {
      const snap = await getDocs(collection(db, 'units'));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Unit[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'units');
    }
  },

  async createUnit(unit: Omit<Unit, 'id'>): Promise<Unit> {
    const id = `un-${Date.now()}`;
    const newUnit: Unit = { ...unit, id };
    try {
      await setDoc(doc(db, 'units', id), newUnit);
      return newUnit;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `units/${id}`);
    }
  },
};
