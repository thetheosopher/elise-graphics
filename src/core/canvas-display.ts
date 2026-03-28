export function getDevicePixelRatio(): number {
    if (typeof window === 'undefined') {
        return 1;
    }

    const ratio = Number(window.devicePixelRatio);
    if (!Number.isFinite(ratio) || ratio <= 0) {
        return 1;
    }

    return ratio;
}

export function applyCanvasDisplaySize(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
    pixelRatio: number,
): boolean {
    const nextCssWidth = Math.max(0, cssWidth);
    const nextCssHeight = Math.max(0, cssHeight);
    const nextPixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
    const nextPixelWidth = Math.max(1, Math.round(nextCssWidth * nextPixelRatio));
    const nextPixelHeight = Math.max(1, Math.round(nextCssHeight * nextPixelRatio));
    const widthStyle = `${nextCssWidth}px`;
    const heightStyle = `${nextCssHeight}px`;

    let changed = false;

    if (canvas.width !== nextPixelWidth) {
        canvas.width = nextPixelWidth;
        changed = true;
    }
    if (canvas.height !== nextPixelHeight) {
        canvas.height = nextPixelHeight;
        changed = true;
    }
    if (canvas.style.width !== widthStyle) {
        canvas.style.width = widthStyle;
        changed = true;
    }
    if (canvas.style.height !== heightStyle) {
        canvas.style.height = heightStyle;
        changed = true;
    }

    return changed;
}

export function translateClientPointToCanvasPixels(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    let x = clientX - bounds.left;
    let y = clientY - bounds.top;

    if (bounds.width > 0 && canvas.width !== bounds.width) {
        x *= canvas.width / bounds.width;
    }
    if (bounds.height > 0 && canvas.height !== bounds.height) {
        y *= canvas.height / bounds.height;
    }

    return { x, y };
}