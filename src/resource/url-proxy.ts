export abstract class UrlProxy {
    public getUrl(url: string, callback:(success: boolean, url: string) => void) {
        callback(true, url);
    };
}