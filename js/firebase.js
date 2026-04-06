// Firebase v10 modular SDK imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, EmailAuthProvider, updatePassword, reauthenticateWithCredential, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getFirestore, serverTimestamp, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, startAfter, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js';

// Firebase project configuration (shared with Android app)
const firebaseConfig = {
  apiKey: "AIzaSyD30WNSnANKwKfcWLeiRMfmSiiAYZrhATc",
  authDomain: "apnaghar-a58fd.firebaseapp.com",
  projectId: "apnaghar-a58fd",
  // Note: Storage bucket should be the appspot.com bucket, not the firebasestorage.app URL domain
  storageBucket: "apnaghar-a58fd.appspot.com",
  messagingSenderId: "475698120772",
  appId: "1:475698120772:web:2627a660b68db6b4ca5411",
  measurementId: "G-LSM6RKK705"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Make globals available for scripts that reference window.*
window.db = db;
window.auth = auth;
window.storage = storage;

export {
  app,
  auth,
  db,
  storage,
  // auth
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  // firestore
  serverTimestamp,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  startAfter,
  setDoc,
  // storage
  ref,
  uploadBytes,
  getDownloadURL,
};



