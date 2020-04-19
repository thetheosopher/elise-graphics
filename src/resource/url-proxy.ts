export abstract class UrlProxy {
    getUrl(url: string, callback:(success: boolean, url: string) => void) {
        callback(true, url);
    };
}