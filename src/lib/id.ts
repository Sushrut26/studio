import { v5 as uuidv5 } from 'uuid';

// Namespace UUID for deterministic v5 generation.
// You can regenerate this once and keep it constant.
const NAMESPACE = '6f6c9af0-9b3e-4c61-9e3f-7b7c28721234';

export function firebaseUidToUuid(uid: string): string {
  return uuidv5(uid, NAMESPACE);
}


