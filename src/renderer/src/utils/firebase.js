import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'

// Firebase config untuk Storage (project lama - masih free, sama seperti website)
const firebaseStorageConfig = {
  apiKey: 'AIzaSyB1V-EMM1yaYm6qEge6KYbL9lJ9HZOl93k',
  authDomain: 'hypertopia-id-sec.firebaseapp.com',
  databaseURL: 'https://hypertopia-id-sec-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'hypertopia-id-sec',
  storageBucket: 'hypertopia-id-sec.appspot.com',
  messagingSenderId: '471391816995',
  appId: '1:471391816995:web:1174a390e903778d5d5096'
}

const app = initializeApp(firebaseStorageConfig, 'hypertopia-storage')
export const storage = getStorage(app)
