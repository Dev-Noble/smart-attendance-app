import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCpgm25APvfuxGU62oEzu0avNIINnHrRPQ",
  authDomain: "smas-7047b.firebaseapp.com",
  projectId: "smas-7047b",
  storageBucket: "smas-7047b.firebasestorage.app",
  messagingSenderId: "975339484803",
  appId: "1:975339484803:web:e22343a38ce0d6ba244db6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAtRiskStudent() {
  try {
    const studentData = {
      name: "Jane Smith (At Risk Example)",
      email: "jane.smith.atrisk@crawforduniversity.edu.ng",
      studentId: "CU/23/0099",
      departmentId: "Computer Science",
      levelId: "400 Level",
      attendance: 15, // Extremely low attendance to trigger the 'at-risk' criteria
      status: "at-risk",
      courses: ["CSC401", "CSC402"],
      phone: "+2348011112222",
      address: "Crawford University Hostel C",
      lastSeen: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'students'), studentData);
    console.log("Student successfully added with document ID:", docRef.id);
    process.exit(0);
  } catch (error) {
    console.error("Error adding student:", error);
    process.exit(1);
  }
}

addAtRiskStudent();
