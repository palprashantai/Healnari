import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

console.log('🧹 Starting final cleanup of extra folders and files...\n');

let deletedFiles = 0;
let deletedDirs = 0;

// Helper to delete all .jsx files directly in a directory
function deleteFlatFiles(dir) {
  const targetDir = path.join(SRC_DIR, dir);
  if (!fs.existsSync(targetDir)) return;
  
  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    const fullPath = path.join(targetDir, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.jsx')) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file: src/${dir}/${file}`);
      deletedFiles++;
    }
  }
}

// Helper to remove empty directories
function deleteEmptyDir(dir) {
  const targetDir = path.join(SRC_DIR, dir);
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmdirSync(targetDir);
      console.log(`Deleted empty folder: src/${dir}`);
      deletedDirs++;
    } catch (e) {
      console.warn(`Could not delete folder src/${dir} (it may not be empty)`);
    }
  }
}

// 1. Delete all old flat files in pages and components
deleteFlatFiles('pages');
deleteFlatFiles('components');

// 2. Delete empty subdirectories
deleteEmptyDir('pages/admin');
deleteEmptyDir('pages/doctor');
deleteEmptyDir('pages/patient');
deleteEmptyDir('components/landing');
deleteEmptyDir('components/features');

// 3. Try to delete parent directories if they are now completely empty
deleteEmptyDir('layouts'); // Should be fully empty
deleteEmptyDir('pages');   // Should be fully empty now

console.log(`\n✅ Cleanup complete!`);
console.log(`Deleted ${deletedFiles} old files and ${deletedDirs} empty folders.`);
