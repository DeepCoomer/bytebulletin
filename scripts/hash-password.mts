/**
 * pnpm auth:hash — set the owner password.
 *
 * Prompts twice with hidden input, derives a scrypt hash, writes
 * OWNER_PASSWORD_HASH into the repo-root .env, and prints the hash so it can
 * be copied into Vercel / GitHub env. The password itself is never stored.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolvePrompt) => {
    process.stdout.write(question);
    const { stdin } = process;
    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.setEncoding('utf8');
    let input = '';
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolvePrompt(input);
      } else if (ch === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        input = input.slice(0, -1);
      } else {
        input += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const first = await promptHidden('Owner password (hidden): ');
if (first.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
const second = await promptHidden('Repeat password: ');
if (first !== second) {
  console.error('Passwords do not match.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(first.normalize(), salt, 64);
const stored = `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;

const envPath = resolve(import.meta.dirname, '../.env');
let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
if (/^OWNER_PASSWORD_HASH=/m.test(env)) {
  env = env.replace(/^OWNER_PASSWORD_HASH=.*$/m, `OWNER_PASSWORD_HASH=${stored}`);
} else {
  env += `${env.endsWith('\n') || env === '' ? '' : '\n'}OWNER_PASSWORD_HASH=${stored}\n`;
}
writeFileSync(envPath, env);

console.log('\nWritten to .env. Copy this value into Vercel env as OWNER_PASSWORD_HASH:\n');
console.log(stored);
