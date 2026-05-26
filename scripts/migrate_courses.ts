// migrate_courses.ts
// Run with `ts-node` or compile and execute.
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const DEFAULT_DEPT_ID = 'default-dept-id'; // Ensure a department exists with this ID.
const DEFAULT_LEVEL_ID = 'default-level-id'; // Ensure a level exists with this ID.

async function migrate() {
  const coursesSnap = await getDocs(collection(db, 'courses'));
  const batch = [];
  for (const c of coursesSnap.docs) {
    const data = c.data() as any;
    const updates: any = {};
    if (!data.departmentId) updates.departmentId = DEFAULT_DEPT_ID;
    if (!data.levelId) updates.levelId = DEFAULT_LEVEL_ID;
    if (Object.keys(updates).length > 0) {
      batch.push(updateDoc(doc(db, 'courses', c.id), updates));
    }
  }
  await Promise.all(batch);
  console.log(`Migrated ${batch.length} courses`);
}

migrate().catch(console.error);
