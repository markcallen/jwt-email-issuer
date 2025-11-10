const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const cjsDir = path.join(rootDir, 'dist', 'cjs');

async function renameJsToCjs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await renameJsToCjs(fullPath);
        return;
      }

      if (entry.isFile() && path.extname(entry.name) === '.js') {
        const targetPath = path.join(dir, `${path.parse(entry.name).name}.cjs`);
        await fs.rename(fullPath, targetPath);
      }
    }),
  );
}

renameJsToCjs(cjsDir).catch((error) => {
  if (error && error.code === 'ENOENT') {
    return;
  }

  console.error('[postbuild] Failed to rename CJS outputs:', error);
  process.exitCode = 1;
});
