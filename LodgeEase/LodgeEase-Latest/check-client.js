const fs = require('fs');
const path = require('path');

// Files that must exist for client to work properly
const requiredFiles = [
  'ClientSide/Homepage/rooms.html',
  'ClientSide/Homepage/room-redirect-fix.js',
  'ClientSide/Homepage/admin-connector.js',
  'ClientSide/Homepage/rooms.js',
  'ClientSide/js/common.js',
  'ClientSide/styles/styles-fix.css',
  'ClientSide/firebase.js',
  'ClientSide/index.html',
];

let missingFiles = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
} else {
  console.log('✅ All required files present.');
  process.exit(0);
}
