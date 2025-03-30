const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure the dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist directory');
}

// Run tailwindcss command to build the CSS
console.log('Building Tailwind CSS...');
exec('npx tailwindcss -i ./src/input.css -o ./dist/output.css', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building CSS: ${error.message}`);
    // Create a basic CSS file as fallback
    const basicCSS = `
/* Fallback CSS generated on ${new Date().toISOString()} */
/* This is a minimal set of styles to keep the site functional */
.container { width: 100%; margin-left: auto; margin-right: auto; max-width: 1200px; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
/* ...more basic styles... */
`;
    fs.writeFileSync(path.join(distDir, 'output.css'), basicCSS);
    console.log('Created fallback CSS file');
    return;
  }
  
  console.log('Tailwind CSS built successfully!');
  
  // Copy to AdminSide/dist as well for compatibility
  const adminDistDir = path.join(__dirname, 'AdminSide', 'dist');
  if (!fs.existsSync(adminDistDir)) {
    fs.mkdirSync(adminDistDir, { recursive: true });
  }
  
  fs.copyFileSync(
    path.join(distDir, 'output.css'),
    path.join(adminDistDir, 'tailwind.css')
  );
  
  console.log('CSS copied to AdminSide/dist directory');
});
