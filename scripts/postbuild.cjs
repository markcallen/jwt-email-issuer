const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const cjsDir = path.join(rootDir, 'dist', 'cjs');

const RELATIVE_IMPORT_RE = /(['"])(\.{1,2}\/[^'"]+)\.js\1/g;

async function rewriteRelativeImports(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const updated = content.replace(
    RELATIVE_IMPORT_RE,
    (_, quote, rel) => `${quote}${rel}.cjs${quote}`,
  );

  if (updated !== content) {
    await fs.writeFile(filePath, updated);
  }
}

async function convertJsToCjs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await convertJsToCjs(fullPath);
        return;
      }

      if (!entry.isFile()) return;

      if (path.extname(entry.name) === '.js') {
        const targetPath = path.join(dir, `${path.parse(entry.name).name}.cjs`);
        await fs.rename(fullPath, targetPath);
        await rewriteRelativeImports(targetPath);
        return;
      }

      if (path.extname(entry.name) === '.cjs') {
        await rewriteRelativeImports(fullPath);
      }
    }),
  );
}

convertJsToCjs(cjsDir).catch((error) => {
  if (error && error.code === 'ENOENT') {
    return;
  }

  console.error('[postbuild] Failed to rename CJS outputs:', error);
  process.exitCode = 1;
});
