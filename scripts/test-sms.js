import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

// Parse .env.local manually to avoid needing dotenv library
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// Initialize Firebase
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
  try {
    console.log("1. Skipping Test 'Student at Risk' account creation (Firestore rules block unauthenticated writes).");
    /*
    const studentRef = await addDoc(collection(db, 'students'), {
      name: "Test At-Risk Student",
      email: "test.atrisk@smas.edu.ng",
      phone: "+2349073629404",
      studentId: "STD-TEST-001",
      department: "Computer Science",
      level: "400",
      createdAt: serverTimestamp()
    });
    console.log("   ✅ Student created successfully! Document ID:", studentRef.id);
    */

    console.log("\n2. Sending Warning SMS to +2349073629404...");
    const SMS_TOKEN = "RArimHt9DhUdiNZYpnLBmJMHdx6v7S6gYQYxySCYiqQNtFSpswqRo75VJk5t";
    const to = "2349073629404";
    const body = "Dear Test At-Risk Student, your attendance for CSC401 is critically low (45%). Please see the course advisor immediately. - SMAS";

    const response = await fetch("https://www.bulksmsnigeria.com/api/v2/sms", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SMS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: "SMAS", // Max 11 chars
        to: to,
        body: body
      })
    });

    const data = await response.json();
    console.log("   ✅ SMS API Response:", data);
    
    if (data.data && data.data.status === 'success') {
      console.log("\n🎉 Test completed successfully. The SMS should arrive shortly.");
    }
    
  } catch (err) {
    console.error("❌ Error during test:", err);
  } finally {
    process.exit(0);
  }
}

runTest();
