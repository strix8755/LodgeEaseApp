const fs = require('fs');
const path = require('path');

console.log('Ensuring components folder is available for deployment...');

const clientSidePath = path.join(__dirname, '..', 'ClientSide');
const componentsPath = path.join(clientSidePath, 'components');

// Check if components folder exists
if (!fs.existsSync(componentsPath)) {
  console.log('Components folder not found, creating it...');
  fs.mkdirSync(componentsPath, { recursive: true });
}

// Verify image files in the components folder
const requiredImages = [
  '3.jpg', '4.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg', '11.jpg',
  'hero-bg.jpg', 'pinehaven.jpg', 'SuperApartmentRoom6.jpg', 'LodgeEaseLogo.png',
  'marita-kavelashvili-ugnrXk1129g-unsplash.jpg'
];

const missingImages = [];

// Check for missing images
requiredImages.forEach(imageName => {
  const imagePath = path.join(componentsPath, imageName);
  if (!fs.existsSync(imagePath)) {
    missingImages.push(imageName);
  }
});

if (missingImages.length > 0) {
  console.error('⚠️ Warning: The following images are missing from the components folder:');
  missingImages.forEach(img => console.error(`  - ${img}`));
  console.error('\nPlease make sure these images are placed in ClientSide/components/');
} else {
  console.log('✅ All required images found in components folder.');
}

// Set proper permissions for the components folder and its contents
try {
  fs.chmodSync(componentsPath, 0o755);
  console.log('✅ Set permissions for components folder.');
  
  // Set permissions for all files in the folder
  const files = fs.readdirSync(componentsPath);
  files.forEach(file => {
    const filePath = path.join(componentsPath, file);
    fs.chmodSync(filePath, 0o644);
  });
  console.log('✅ Set permissions for all image files.');
} catch (error) {
  console.error('Error setting permissions:', error);
}

console.log('Components folder check completed.');
