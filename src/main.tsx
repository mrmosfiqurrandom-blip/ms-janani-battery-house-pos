import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase.ts';

// Validate connection to Firestore
testConnection();

createRoot(document.getElementById('root')!).render(<App />);
