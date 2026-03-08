import { initializeApp } from 'firebase/app'

// Firebase config (project lama) – Storage no longer used, cover images served from Cloudinary
const firebaseStorageConfig = {
  apiKey: 'REMOVED_FIREBASE_API_KEY',
  authDomain: 'hypertopia-id-sec.firebaseapp.com',
  databaseURL: 'https://hypertopia-id-sec-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'hypertopia-id-sec',
  storageBucket: 'hypertopia-id-sec.appspot.com',
  messagingSenderId: '471391816995',
  appId: '1:471391816995:web:1174a390e903778d5d5096'
}

export const app = initializeApp(firebaseStorageConfig, 'hypertopia-storage')
