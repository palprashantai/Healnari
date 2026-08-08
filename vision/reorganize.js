const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const moveMap = {
  // Shared Interfaces
  'appointments/appointment.entity.ts': 'shared/interfaces/appointment.interface.ts',
  'clinical-notes/clinical-note.entity.ts': 'shared/interfaces/clinical-note.interface.ts',
  'patients/cycle-log.entity.ts': 'shared/interfaces/cycle-log.interface.ts',
  'records/lab-report.entity.ts': 'shared/interfaces/lab-report.interface.ts',
  'patients/patient-record.entity.ts': 'shared/interfaces/patient-record.interface.ts',
  'payments/payment.entity.ts': 'shared/interfaces/payment.interface.ts',
  'records/prescription.entity.ts': 'shared/interfaces/prescription.interface.ts',
  'profiles/profile.entity.ts': 'shared/interfaces/profile.interface.ts',
  'admin/refund-request.entity.ts': 'shared/interfaces/refund-request.interface.ts',
  'admin/support-ticket.entity.ts': 'shared/interfaces/support-ticket.interface.ts',
  
  // Core
  'auth/auth.controller.ts': 'core/auth/auth.controller.ts',
  'auth/auth.module.ts': 'core/auth/auth.module.ts',
  'auth/auth.service.ts': 'core/auth/auth.service.ts',
  'supabase/supabase.module.ts': 'core/supabase/supabase.module.ts',
  'supabase/supabase.service.ts': 'core/supabase/supabase.service.ts',
  'common/constants/errors.constant.ts': 'core/constants/errors.constant.ts',
  'common/constants/messages.constant.ts': 'core/constants/messages.constant.ts',
  'common/decorators/current-user.decorator.ts': 'core/decorators/current-user.decorator.ts',
  'common/decorators/public.decorator.ts': 'core/decorators/public.decorator.ts',
  'common/filters/http-exception.filter.ts': 'core/filters/http-exception.filter.ts',
  'common/guards/supabase-auth.guard.ts': 'core/guards/supabase-auth.guard.ts',
  'common/helpers/response.helper.ts': 'core/helpers/response.helper.ts',

  // Modules
  'admin/admin.controller.ts': 'modules/admin/controllers/admin.controller.ts',
  'admin/admin.service.ts': 'modules/admin/services/admin.service.ts',
  'admin/admin.module.ts': 'modules/admin/admin.module.ts',
  
  'ai/chat.controller.ts': 'modules/ai/controllers/chat.controller.ts',
  'ai/ai.service.ts': 'modules/ai/services/ai.service.ts',
  'ai/ai.module.ts': 'modules/ai/ai.module.ts',

  'appointments/appointments.controller.ts': 'modules/appointments/controllers/appointments.controller.ts',
  'appointments/appointments.service.ts': 'modules/appointments/services/appointments.service.ts',
  'appointments/appointments.module.ts': 'modules/appointments/appointments.module.ts',

  'doctors/doctors.controller.ts': 'modules/doctors/controllers/doctors.controller.ts',
  'doctors/doctors.service.ts': 'modules/doctors/services/doctors.service.ts',
  'doctors/doctors.module.ts': 'modules/doctors/doctors.module.ts',

  'patients/patients.controller.ts': 'modules/patients/controllers/patients.controller.ts',
  'patients/patients.service.ts': 'modules/patients/services/patients.service.ts',
  'patients/patients.module.ts': 'modules/patients/patients.module.ts',

  'records/records.controller.ts': 'modules/records/controllers/records.controller.ts',
  'records/records.service.ts': 'modules/records/services/records.service.ts',
  'records/records.module.ts': 'modules/records/records.module.ts',
};

// Root files stay in src
const rootFiles = ['app.controller.ts', 'app.module.ts', 'app.service.ts', 'main.ts', 'app.controller.spec.ts'];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (filePath.endsWith('.ts')) fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsFiles = getAllFiles(srcDir);

// Read all files in memory
const fileContents = new Map();
for (const file of allTsFiles) {
  fileContents.set(file, fs.readFileSync(file, 'utf8'));
}

// Prepare inverse map: absolute old path without extension -> new relative path without extension
const pathMap = new Map();
for (const [oldRel, newRel] of Object.entries(moveMap)) {
  const oldAbs = path.join(srcDir, oldRel).replace(/\.ts$/, '');
  const newImportPath = newRel.replace(/\.ts$/, '');
  pathMap.set(oldAbs.replace(/\\/g, '/'), newImportPath);
}

for (const rootFile of rootFiles) {
  const oldAbs = path.join(srcDir, rootFile).replace(/\.ts$/, '');
  pathMap.set(oldAbs.replace(/\\/g, '/'), rootFile.replace(/\.ts$/, ''));
}

// Process imports
const importRegex = /from\s+['"]([^'"]+)['"]/g;

const updatedContents = new Map();
for (const [filePath, content] of fileContents.entries()) {
  const currentDir = path.dirname(filePath);
  
  const updatedContent = content.replace(importRegex, (match, importPath) => {
    // We only care about relative imports
    if (importPath.startsWith('.')) {
      const resolvedAbs = path.resolve(currentDir, importPath).replace(/\\/g, '/');
      if (pathMap.has(resolvedAbs)) {
        return `from '@/${pathMap.get(resolvedAbs)}'`;
      }
      // If it maps to something inside src that isn't mapped, theoretically we could still use @/
      const srcPrefix = srcDir.replace(/\\/g, '/');
      if (resolvedAbs.startsWith(srcPrefix)) {
        const relativeToSrc = resolvedAbs.substring(srcPrefix.length + 1);
        return `from '@/${relativeToSrc}'`;
      }
    }
    return match;
  });
  updatedContents.set(filePath, updatedContent);
}

// Write everything out to new locations
for (const [oldRel, newRel] of Object.entries(moveMap)) {
  const oldPath = path.join(srcDir, oldRel);
  const newPath = path.join(srcDir, newRel);
  
  const content = updatedContents.get(oldPath);
  if (content !== undefined) {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.writeFileSync(newPath, content);
    fs.unlinkSync(oldPath); // Delete old file
    console.log(`Moved ${oldRel} to ${newRel}`);
  } else {
    console.warn(`File not found: ${oldPath}`);
  }
}

// Update root files
for (const rootFile of rootFiles) {
  const oldPath = path.join(srcDir, rootFile);
  const content = updatedContents.get(oldPath);
  if (content !== undefined) {
    fs.writeFileSync(oldPath, content);
    console.log(`Updated root file ${rootFile}`);
  }
}

console.log('Done!');
