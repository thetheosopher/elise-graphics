export class Logging {
    public static enabled = false;

    public static log(message: string) {
        if (Logging.enabled) {
            console.log(message);
        }
    }
}
