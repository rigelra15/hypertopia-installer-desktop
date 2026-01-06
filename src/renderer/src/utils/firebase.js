import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCDfNWLyB_sU4TZk4s-TrC27qXZgtMPJZQ',
  authDomain: 'hypertopia-id-bc.firebaseapp.com',
  databaseURL: 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'hypertopia-id-bc',
  storageBucket: 'hypertopia-id-bc.appspot.com',
  messagingSenderId: '1089206526652',
  appId: '1:1089206526652:web:fbeee5a8bc3c1c0478e6f0'
}

const app = initializeApp(firebaseConfig, 'hypertopia-storage')
export const storage = getStorage(app)
