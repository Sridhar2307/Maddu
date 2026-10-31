const fs = require('fs');
const { execSync } = require('child_process');

if (fs.existsSync('maddu-new')) {
  console.log('Building from root: compiling maddu-new frontend...');
  execSync('npm --prefix maddu-new install', { stdio: 'inherit' });
  execSync('npm --prefix maddu-new run build', { stdio: 'inherit' });
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  fs.cpSync('maddu-new/dist', 'dist', { recursive: true });
  console.log('✓ Successfully built and copied maddu-new/dist to root dist');
} else {
  console.log('Building directly from inside maddu-new...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✓ Successfully built dist');
}

