import { Utility } from '../../core/utility';

test('utility getRemoteTextAsync resolves callback value', async () => {
    const mock = jest.spyOn(Utility, 'getRemoteText').mockImplementation((_url, callback) => {
        callback('ok');
    });

    const value = await Utility.getRemoteTextAsync('/test.txt');
    expect(value).toBe('ok');

    mock.mockRestore();
});

test('utility getRemoteBytesAsync resolves callback value', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const mock = jest.spyOn(Utility, 'getRemoteBytes').mockImplementation((_url, callback) => {
        callback(bytes);
    });

    const value = await Utility.getRemoteBytesAsync('/test.bin');
    expect(value).toEqual(bytes);

    mock.mockRestore();
});

test('utility getRemoteBlobAsync resolves callback value', async () => {
    const blob = new Blob(['x'], { type: 'text/plain' });
    const mock = jest.spyOn(Utility, 'getRemoteBlob').mockImplementation((_url, callback) => {
        callback(blob);
    });

    const value = await Utility.getRemoteBlobAsync('/test.blob');
    expect(value).toBe(blob);

    mock.mockRestore();
});

test('utility startsWith delegates expected behavior', () => {
    expect(Utility.startsWith('elise-graphics', 'elise')).toBe(true);
    expect(Utility.startsWith('elise-graphics', 'graphics')).toBe(false);
});

test('utility endsWith delegates expected behavior', () => {
    expect(Utility.endsWith('elise-graphics', 'graphics')).toBe(true);
    expect(Utility.endsWith('elise-graphics', 'elise')).toBe(false);
});
