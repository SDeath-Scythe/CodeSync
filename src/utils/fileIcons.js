// File icon mapping using material-icon-theme icons
// Icons are served from the public/icons folder

// Base path to icons (served from public folder)
const ICONS_PATH = '/icons/';

// File extension to icon mapping
const fileExtensionIcons = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'react',
  ts: 'typescript',
  tsx: 'react_ts',
  mjs: 'javascript',
  cjs: 'javascript',
  
  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  
  // Data/Config
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'settings',
  env: 'tune',
  
  // Documentation
  md: 'markdown',
  mdx: 'markdown',
  txt: 'document',
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  
  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'svg',
  ico: 'image',
  webp: 'image',
  
  // Programming languages
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  
  // Shell
  sh: 'console',
  bash: 'console',
  zsh: 'console',
  ps1: 'powershell',
  bat: 'console',
  cmd: 'console',
  
  // Database
  sql: 'database',
  db: 'database',
  sqlite: 'database',
  
  // Other
  gitignore: 'git',
  dockerignore: 'docker',
  lock: 'lock',
  log: 'log',
  zip: 'zip',
  tar: 'zip',
  gz: 'zip',
  rar: 'zip',
};

// Filename to icon mapping (for specific files)
const fileNameIcons = {
  'package.json': 'nodejs',
  'package-lock.json': 'nodejs',
  'tsconfig.json': 'tsconfig',
  'jsconfig.json': 'json',
  '.gitignore': 'git',
  '.env': 'tune',
  '.env.local': 'tune',
  '.env.development': 'tune',
  '.env.production': 'tune',
  'dockerfile': 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  '.dockerignore': 'docker',
  'readme.md': 'readme',
  'readme': 'readme',
  'license': 'certificate',
  'license.md': 'certificate',
  '.eslintrc': 'eslint',
  '.eslintrc.js': 'eslint',
  '.eslintrc.json': 'eslint',
  'eslint.config.js': 'eslint',
  '.prettierrc': 'prettier',
  '.prettierrc.js': 'prettier',
  'prettier.config.js': 'prettier',
  'vite.config.js': 'vite',
  'vite.config.ts': 'vite',
  'webpack.config.js': 'webpack',
  'rollup.config.js': 'rollup',
  'babel.config.js': 'babel',
  '.babelrc': 'babel',
  'tailwind.config.js': 'tailwindcss',
  'tailwind.config.ts': 'tailwindcss',
  'postcss.config.js': 'postcss',
  'jest.config.js': 'jest',
  'vitest.config.js': 'vitest',
  'vitest.config.ts': 'vitest',
  'prisma': 'prisma',
  'schema.prisma': 'prisma',
};

// Folder name to icon mapping
const folderNameIcons = {
  src: 'folder-src',
  source: 'folder-src',
  public: 'folder-public',
  assets: 'folder-resource',
  images: 'folder-images',
  img: 'folder-images',
  components: 'folder-components',
  pages: 'folder-views',
  views: 'folder-views',
  styles: 'folder-resource',
  css: 'folder-resource',
  utils: 'folder-utils',
  helpers: 'folder-helper',
  lib: 'folder-lib',
  hooks: 'folder-hook',
  context: 'folder-context',
  services: 'folder-resource',
  api: 'folder-api',
  config: 'folder-config',
  test: 'folder-test',
  tests: 'folder-test',
  __tests__: 'folder-test',
  spec: 'folder-test',
  node_modules: 'folder-node',
  dist: 'folder-dist',
  build: 'folder-dist',
  out: 'folder-dist',
  docs: 'folder-docs',
  documentation: 'folder-docs',
  scripts: 'folder-resource',
  server: 'folder-server',
  client: 'folder-resource',
  prisma: 'folder-prisma',
  database: 'folder-database',
  db: 'folder-database',
  migrations: 'folder-database',
  models: 'folder-database',
  types: 'folder-resource',
  interfaces: 'folder-resource',
  store: 'folder-resource',
  redux: 'folder-resource',
  state: 'folder-resource',
  routes: 'folder-resource',
  router: 'folder-resource',
  middleware: 'folder-resource',
  layouts: 'folder-resource',
  templates: 'folder-resource',
  fonts: 'folder-resource',
  icons: 'folder-images',
  svg: 'folder-resource',
  data: 'folder-database',
  mock: 'folder-resource',
  mocks: 'folder-resource',
  __mocks__: 'folder-resource',
  constants: 'folder-resource',
  env: 'folder-config',
  environments: 'folder-config',
};

/**
 * Get the icon path for a file
 * @param {string} fileName - The name of the file
 * @returns {string} - The path to the icon SVG
 */
export const getFileIconPath = (fileName) => {
  const lowerName = fileName.toLowerCase();
  
  // Check if there's a specific icon for this filename
  if (fileNameIcons[lowerName]) {
    return `${ICONS_PATH}${fileNameIcons[lowerName]}.svg`;
  }
  
  // Get the file extension
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  // Check if there's an icon for this extension
  if (ext && fileExtensionIcons[ext]) {
    return `${ICONS_PATH}${fileExtensionIcons[ext]}.svg`;
  }
  
  // Default file icon
  return `${ICONS_PATH}file.svg`;
};

/**
 * Get the icon path for a folder
 * @param {string} folderName - The name of the folder
 * @param {boolean} isOpen - Whether the folder is open
 * @returns {string} - The path to the icon SVG
 */
export const getFolderIconPath = (folderName, isOpen = false) => {
  const lowerName = folderName.toLowerCase();
  const suffix = isOpen ? '-open' : '';
  
  // Check if there's a specific icon for this folder name
  if (folderNameIcons[lowerName]) {
    return `${ICONS_PATH}${folderNameIcons[lowerName]}${suffix}.svg`;
  }
  
  // Default folder icon
  return `${ICONS_PATH}folder${suffix}.svg`;
};

/**
 * Get the icon name for a file (without path and extension)
 * @param {string} fileName - The name of the file
 * @returns {string} - The icon name
 */
export const getFileIconName = (fileName) => {
  const lowerName = fileName.toLowerCase();
  
  if (fileNameIcons[lowerName]) {
    return fileNameIcons[lowerName];
  }
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (ext && fileExtensionIcons[ext]) {
    return fileExtensionIcons[ext];
  }
  
  return 'file';
};

/**
 * Get the icon name for a folder (without path and extension)
 * @param {string} folderName - The name of the folder
 * @returns {string} - The icon name
 */
export const getFolderIconName = (folderName) => {
  const lowerName = folderName.toLowerCase();
  
  if (folderNameIcons[lowerName]) {
    return folderNameIcons[lowerName];
  }
  
  return 'folder';
};
