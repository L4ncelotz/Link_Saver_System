import { writable } from 'svelte/store';
import { db } from '../services/db';

export const isVaultLocked = writable<boolean>(false);
export const vaultPassword = writable<string>('');

export async function lockVault() {
  isVaultLocked.set(true);
  vaultPassword.set('');
  // In a real app, we would clear memory and only leave encrypted payload in db
}

export async function unlockVault(password: string) {
  // Try decrypting payload from db.vault
  // If success:
  vaultPassword.set(password);
  isVaultLocked.set(false);
}
