import { Logging } from './logging';

/**
 * Exposes shared utility methods
 */
export class Utility {
    /**
     * Retrieves text context via async ajax call
     * @param url - URL to be retrieved
     * @param callback - Result callback (result:string)
     * @returns void
     */
    public static getRemoteText(url: string, callback: (result: string | undefined) => void): void {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.overrideMimeType('text/plain; charset=x-user-defined');
        request.onreadystatechange = _status => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    callback(request.responseText);
                }
                else {
                    callback(undefined);
                }
            }
        };
        request.onabort = () => {
            Logging.log('Request Aborted: ' + url);
            callback(undefined);
        };
        request.onerror = () => {
            Logging.log('Request Error: ' + url + '\r' + request.responseText);
            callback(undefined);
        };
        request.send(null);
    }

    /**
     * Retrieves text content via async ajax call as a Promise.
     * @param url - URL to be retrieved
     * @returns Promise resolving to response text or undefined on failure
     */
    public static getRemoteTextAsync(url: string): Promise<string | undefined> {
        return new Promise(resolve => {
            Utility.getRemoteText(url, result => {
                resolve(result);
            });
        });
    }

    /**
     * Retrieves binary content via async ajax call
     * @param url - URL to be retrieved
     * @param callback - Result callback
     * @returns void
     */
    public static getRemoteBytes(url: string, callback: (result: Uint8Array | undefined) => void): void {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onreadystatechange = _status => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    const byteArray = new Uint8Array(request.response);
                    callback(byteArray);
                }
                else {
                    callback(undefined);
                }
            }
        };
        request.onabort = () => {
            Logging.log('Request Aborted: ' + url);
            callback(undefined);
        };
        request.onerror = () => {
            Logging.log('Request Error: ' + url + '\r' + request.responseText);
            callback(undefined);
        };
        request.send(null);
    }

    /**
     * Retrieves binary content via async ajax call as a Promise.
     * @param url - URL to be retrieved
     * @returns Promise resolving to bytes or undefined on failure
     */
    public static getRemoteBytesAsync(url: string): Promise<Uint8Array | undefined> {
        return new Promise(resolve => {
            Utility.getRemoteBytes(url, result => {
                resolve(result);
            });
        });
    }

    /**
     * Retrieves binary content as blob via async ajax call
     * @param url - URL to be retrieved
     * @param callback - Result callback
     * @returns void
     */
    public static getRemoteBlob(url: string, callback: (result: Blob | undefined) => void): void {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'blob';
        request.onreadystatechange = _status => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    callback(request.response);
                }
                else {
                    callback(undefined);
                }
            }
        };
        request.onabort = () => {
            Logging.log('Request Aborted: ' + url);
            callback(undefined);
        };
        request.onerror = () => {
            Logging.log('Request Error: ' + url + '\r' + request.responseText);
            callback(undefined);
        };
        request.send(null);
    }

    /**
     * Retrieves binary blob content via async ajax call as a Promise.
     * @param url - URL to be retrieved
     * @returns Promise resolving to blob or undefined on failure
     */
    public static getRemoteBlobAsync(url: string): Promise<Blob | undefined> {
        return new Promise(resolve => {
            Utility.getRemoteBlob(url, result => {
                resolve(result);
            });
        });
    }

    /**
     * Determines if a string ends with a different string
     * @param str - String to be evaluated
     * @param suffix - Suffix to be evaluated
     * @returns True if string ends with suffix
     */
    public static endsWith(str: string, suffix: string): boolean {
        return str.endsWith(suffix);
    }

    /**
     * Determines if a string starts with a different string
     * @param string String to be searched
     * @param prefix Prefix
     * @returns True if string starts with prefix
     */
    public static startsWith(string: string, prefix: string): boolean {
        return string.startsWith(prefix);
    }

    /**
     * Joins two path segments, ensuring they are separated by a single path separator character ('/')
     * @param path1 - First path segment
     * @param path2 - Second path segment
     * @returns Joined path segment
     */
    public static joinPaths(path1: string, path2: string) {
        if (!path1) {
            path1 = '';
        }
        if (path2.substring(0, 1) === '/') {
            path2 = path2.substring(1, path2.length);
        }
        if (Utility.endsWith(path1, '/')) {
            return path1 + path2;
        }
        return path1 + '/' + path2;
    }

    /**
     * Creates a new globally unique identifier (GUID)
     * @returns New guid represented as a string in the form xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     */
    public static guid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
