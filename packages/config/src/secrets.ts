import { readFileSync } from 'node:fs';

export type SecretSource = {
  env?: NodeJS.ProcessEnv;
  fileSuffix?: string;
};

export function loadSecret(name: string, options: SecretSource = {}): string {
  const env = options.env ?? process.env;
  const fileKey = `${name}${options.fileSuffix ?? '_FILE'}`;
  const direct = env[name];
  const filePath = env[fileKey];

  if (direct && filePath) {
    throw new Error(`Secret ${name} must be provided either directly or via ${fileKey}, not both.`);
  }

  const value = filePath ? readFileSync(filePath, 'utf8') : direct;
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required secret ${name}.`);
  }

  return value.trim();
}
