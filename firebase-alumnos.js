import {
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",
  authDomain: "sistema-alumnos-xammar.firebaseapp.com",
  projectId: "sistema-alumnos-xammar",
  storageBucket: "sistema-alumnos-xammar.firebasestorage.app",
  messagingSenderId: "286883206743",
  appId: "1:286883206743:web:bebde00cff1bc372293512"
};

const app = getApps().find((firebaseApp) => firebaseApp.name === "[DEFAULT]")
  || initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
