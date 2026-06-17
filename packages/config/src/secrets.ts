import { readFileSync, realpathSync, statSync } from 'node:fs';

const MAX_SECRET_BYTES = 64 * 1024;

export type SecretSource = {
  env?: NodeJS.ProcessEnv;
  fileSuffix?: string;
  fileKeys?: string[];
};

export function loadSecret(name: string, options: SecretSource = {}): string {
  const env = options.env ?? process.env;
  const fileKeys = options.fileKeys ?? [`${name}${options.fileSuffix ?? '_FILE'}`];
  const direct = env[name];
  const providedFileKeys = fileKeys.filter((key) => env[key]);

  if (direct && providedFileKeys.length > 0) {
    throw new Error(
      `Secret ${name} must be provided either directly or via ${providedFileKeys.join('/')}, not both.`
    );
  }

  if (providedFileKeys.length > 1) {
    throw new Error(`Secret ${name} must be provided via only one file variable.`);
  }

  const filePath = providedFileKeys[0] ? env[providedFileKeys[0]] : undefined;
  const value = filePath ? readSecretFile(name, filePath) : direct;
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required secret ${name}.`);
  }

  return value.trim();
}

function readSecretFile(name: string, filePath: string): string {
  if (filePath.includes('\0')) {
    throw new Error(`Secret ${name} file path is invalid.`);
  }

  const realPath = realpathSync(filePath);
  const stats = statSync(realPath);
  if (!stats.isFile()) {
    throw new Error(`Secret ${name} file path must reference a file.`);
  }

  if (stats.size > MAX_SECRET_BYTES) {
    throw new Error(`Secret ${name} file is too large.`);
  }

  return readFileSync(realPath, 'utf8');
}
