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
        request.onreadystatechange = status => {
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
            console.log('Request Aborted: ' + url);
            callback(undefined);
        };
        request.onerror = () => {
            console.log('Request Error: ' + url + '\r' + request.responseText);
            callback(undefined);
        };
        request.send(null);
    }

    /**
     * Determines if a string ends with a different string
     * @param str - String to be evaluated
     * @param suffix - Suffix to be evaluated
     * @returns True if string ends with suffix
     */
    public static endsWith(str: string, suffix: string): boolean {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
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
