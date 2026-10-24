const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsRoots = ['backend', 'student-portal/js', 'admin-portal/js'];
const htmlRoots = ['student-portal', 'admin-portal'];

function filesIn(directory, extension) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap(function (entry) {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return filesIn(relative, extension);
      return path.extname(entry.name) === extension ? [relative] : [];
    });
}

filesIn('backend', '.js').concat(filesIn('student-portal/js', '.js'), filesIn('admin-portal/js', '.js'))
  .forEach(function (file) {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  });

htmlRoots.forEach(function (directory) {
  filesIn(directory, '.html').forEach(function (file) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const scripts = [...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(function (match) { return match[1]; });
    if (scripts.length > 0 && scripts[0] !== 'js/api-base.js') {
      throw new Error(file + ': api-base.js must be the first script');
    }
    if (directory === 'admin-portal' && !file.endsWith(path.join('admin-portal', 'index.html'))) {
      const protectedPage = /<body[^>]+data-protected="true"/.test(text);
      if (!protectedPage) throw new Error(file + ': protected admin pages need data-protected="true"');
      const expected = ['js/api-base.js', 'js/auth.js', 'js/admin-common.js'];
      expected.forEach(function (script, index) {
        if (scripts[index] !== script) throw new Error(file + ': scripts must start with api-base.js, auth.js, admin-common.js');
      });
    }
    const pageScript = scripts.find(function (script) {
      return script.startsWith('js/') && !['js/api-base.js', 'js/auth.js', 'js/admin-common.js'].includes(script);
    });
    if (pageScript) {
      const pageJavaScript = fs.readFileSync(path.join(root, directory, pageScript), 'utf8');
      [...pageJavaScript.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].forEach(function (match) {
        if (!new RegExp(`id=["']${match[1]}["']`).test(text)) {
          throw new Error(file + ': missing element id "' + match[1] + '"');
        }
      });
      if (directory === 'admin-portal' && /\bfetch\s*\(/.test(pageJavaScript)) {
        throw new Error(file + ': page requests must use adminFetch');
      }
    }
  });
});

console.log('Static checks passed.');
