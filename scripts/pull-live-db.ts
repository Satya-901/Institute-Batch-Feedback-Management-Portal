/**
 * Helper script to sync/pull live Netlify database data into local data/edupulse.sqlite
 * Usage: bun scripts/pull-live-db.ts  or  npm run pull-live-data
 */
import {
  sqliteSaveClass,
  sqliteSaveBatch,
  sqliteSaveTeacher,
  sqliteSaveStudent,
  sqliteSaveFeedbackForm,
  sqliteSubmitFeedbackResponse,
  getAllData,
} from '../lib/sqlite-server';

const LIVE_API_URL = process.env.LIVE_API_URL || 'https://feedbackmp.netlify.app/api/db';

async function pullLiveData() {
  console.log(`Connecting to live server: ${LIVE_API_URL}...`);
  try {
    const res = await fetch(LIVE_API_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch from live server: ${res.status} ${res.statusText}`);
    }

    const liveData = await res.json();
    console.log(`Retrieved live data:`);
    console.log(` - Classes: ${liveData.classes?.length || 0}`);
    console.log(` - Batches: ${liveData.batches?.length || 0}`);
    console.log(` - Teachers: ${liveData.teachers?.length || 0}`);
    console.log(` - Students: ${liveData.students?.length || 0}`);
    console.log(` - Forms: ${liveData.forms?.length || 0}`);
    console.log(` - Responses: ${liveData.responses?.length || 0}`);

    // Sync classes
    for (const c of liveData.classes || []) {
      await sqliteSaveClass(c);
    }
    // Sync batches
    for (const b of liveData.batches || []) {
      await sqliteSaveBatch(b);
    }
    // Sync teachers
    for (const t of liveData.teachers || []) {
      await sqliteSaveTeacher(t);
    }
    // Sync students
    for (const s of liveData.students || []) {
      await sqliteSaveStudent(s);
    }
    // Sync forms
    for (const f of liveData.forms || []) {
      await sqliteSaveFeedbackForm(f);
    }
    // Sync responses
    for (const r of liveData.responses || []) {
      await sqliteSubmitFeedbackResponse(r);
    }

    const localData = await getAllData();
    console.log(`\nSuccessfully synced into local SQLite (data/edupulse.sqlite):`);
    console.log(` - Local Responses: ${localData.responses.length}`);
    console.log(` - Last updated: ${localData.lastUpdated}`);
    console.log(`\nNow you can safely commit and push without losing any live data!`);
  } catch (err: any) {
    console.error('Error syncing live data:', err.message);
  }
}

pullLiveData();
