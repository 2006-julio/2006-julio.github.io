  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
  import { getStorage } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDGYQoy6ePgujBlJbe_Jf5kcBCrf2rqoc0",
    authDomain: "inglesxammar.firebaseapp.com",
    projectId: "inglesxammar",
    storageBucket: "inglesxammar.firebasestorage.app",
    messagingSenderId: "678146737726",
    appId: "1:678146737726:web:7b7f5808a59a414b44736f",
    measurementId: "G-0JDFX6HM1X"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);
  const analytics = getAnalytics(app);
  export { app, db, storage, auth };
