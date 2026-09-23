import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapPath = path.resolve(__dirname, '../plugin/data/departmentMap.json');

const raw = fs.readFileSync(mapPath, 'utf8');
const data = JSON.parse(raw);

console.log("=== Talk2Doc Verification: Follow-up Profiles & Multilingual Coverage ===");

const profiles = data.followUpProfiles || {};
const profileKeys = Object.keys(profiles);
console.log(`Total Follow-up Profiles: ${profileKeys.length}`);

let issues = 0;
let translatedCount = 0;

for (const key of profileKeys) {
  const prof = profiles[key];
  if (!prof.questions || !Array.isArray(prof.questions) || prof.questions.length === 0) {
    console.error(`❌ Profile '${key}' has no questions!`);
    issues++;
    continue;
  }

  for (const q of prof.questions) {
    if (!q.question) {
      console.error(`❌ Question missing in '${key}'`);
      issues++;
    }
    if (!q.manglish || !q.malayalam) {
      console.warn(`⚠️ Incomplete translations in '${key}' question: ${q.id}`);
    } else {
      translatedCount++;
    }

    if (q.options && Array.isArray(q.options)) {
      for (const opt of q.options) {
        if (!opt.id || !opt.label) {
          console.error(`❌ Option missing id or label in '${key}'`);
          issues++;
        }
      }
    }
  }
}

console.log(`Verified questions: ${translatedCount} with Malayalam and Manglish.`);
if (issues === 0) {
  console.log("✅ All follow-up profiles validated successfully!");
} else {
  console.error(`Found ${issues} issues.`);
  process.exit(1);
}
