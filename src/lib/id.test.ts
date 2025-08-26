import { firebaseUidToUuid } from './id';

describe('firebaseUidToUuid', () => {
  it('generates consistent UUID for the same UID on client and server', () => {
    const uid = 'test-uid';
    const clientId = firebaseUidToUuid(uid);
    const serverId = firebaseUidToUuid(uid);
    const expected = 'bbf89759-e31e-5e6e-b368-1bbf7ba2cce3';
    expect(clientId).toBe(expected);
    expect(serverId).toBe(expected);
  });
});
