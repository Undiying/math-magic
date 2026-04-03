import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArs7rtCQ9fycAOPR0EGUJY8VOzYhV1z5g",
  authDomain: "mathmagic-dda4b.firebaseapp.com",
  projectId: "mathmagic-dda4b",
  storageBucket: "mathmagic-dda4b.firebasestorage.app",
  messagingSenderId: "57860947970",
  appId: "1:57860947970:web:4e9509acab0d9eeaf4a71b",
  databaseURL: "https://mathmagic-dda4b-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
