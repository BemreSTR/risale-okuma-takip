import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD7XyPbY0i5zs-FqQnBsYfTjZTPNGHmqSk",
    authDomain: "okuma-takip-46d31.firebaseapp.com",
    projectId: "okuma-takip-46d31",
    storageBucket: "okuma-takip-46d31.firebasestorage.app",
    messagingSenderId: "211297959550",
    appId: "1:211297959550:web:028412602dffd0ca1c622f",
    measurementId: "G-R1KSKPCP9K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
