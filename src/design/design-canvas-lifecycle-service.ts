import { applyCanvasDisplaySize, getDevicePixelRatio } from '../core/canvas-display';
import { ErrorMessages } from '../core/error-messages';
import type { Size } from '../core/size';
import type { IController } from '../controller/controller';
import type { IDesignController } from './design-controller-interface';
import { DesignRenderer } from './design-renderer';

export interface DesignCanvasLifecycleHost {
    controller: IController & IDesignController;
    model?: {
        getSize(): Size | undefined;
    };
    canvas?: HTMLCanvasElement;
    renderer?: DesignRenderer;
    scale: number;
    pixelRatio: number;
    autoPixelRatio: boolean;
    onCanvasMouseEnter(e: MouseEvent): void;
    onCanvasMouseLeave(e: MouseEvent): void;
    onCanvasMouseDown(e: MouseEvent): void;
    onCanvasContextMenu(e: MouseEvent): void;
    onCanvasMouseMove(e: MouseEvent): void;
    onCanvasTouchStart(e: TouchEvent): void;
    onCanvasTouchMove(e: TouchEvent): void;
    onCanvasTouchEnd(e: TouchEvent): void;
    onCanvasTouchCancel(e: TouchEvent): void;
    onCanvasKeyDown(e: KeyboardEvent): boolean;
    onCanvasDragEnter(e: DragEvent): void;
    onCanvasDragOver(e: DragEvent): void;
    onCanvasDragLeave(e: DragEvent): void;
    onCanvasDrop(e: DragEvent): void;
    onWindowResize(): void;
    windowTouchEnd(e: TouchEvent): void;
    windowTouchMove(e: TouchEvent): void;
    windowTouchCancel(e: TouchEvent): void;
    detachModelController(): void;
    draw(): void;
    clearControllerEvents(): void;
}

export class DesignCanvasLifecycleService {
    public createCanvas(host: DesignCanvasLifecycleHost): void {
        if (!host.model) {
            return;
        }

        const size = host.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        const canvas = document.createElement('canvas');
        canvas.setAttribute('tabindex', '0');
        canvas.style.touchAction = 'none';

        canvas.addEventListener('mouseenter', host.onCanvasMouseEnter);
        canvas.addEventListener('mouseleave', host.onCanvasMouseLeave);
        canvas.addEventListener('mousedown', host.onCanvasMouseDown);
        canvas.addEventListener('contextmenu', host.onCanvasContextMenu);
        canvas.addEventListener('mousemove', host.onCanvasMouseMove);
        canvas.addEventListener('touchstart', host.onCanvasTouchStart, { passive: false });
        canvas.addEventListener('touchmove', host.onCanvasTouchMove, { passive: false });
        canvas.addEventListener('touchend', host.onCanvasTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', host.onCanvasTouchCancel, { passive: false });
        canvas.addEventListener('keydown', host.onCanvasKeyDown);
        canvas.addEventListener('dragenter', host.onCanvasDragEnter);
        canvas.addEventListener('dragover', host.onCanvasDragOver);
        canvas.addEventListener('dragleave', host.onCanvasDragLeave);
        canvas.addEventListener('drop', host.onCanvasDrop);

        host.canvas = canvas;
        host.renderer = new DesignRenderer(host.controller);
        this.refreshPixelRatio(host, true);
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('resize', host.onWindowResize, true);
        }
    }

    public detach(host: DesignCanvasLifecycleHost): void {
        if (host.model) {
            host.detachModelController();
        }

        if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('touchend', host.windowTouchEnd, true);
            window.removeEventListener('touchmove', host.windowTouchMove, true);
            window.removeEventListener('touchcancel', host.windowTouchCancel, true);
            window.removeEventListener('resize', host.onWindowResize, true);
        }

        if (!host.canvas) {
            return;
        }

        host.canvas.removeEventListener('mouseenter', host.onCanvasMouseEnter);
        host.canvas.removeEventListener('mouseleave', host.onCanvasMouseLeave);
        host.canvas.removeEventListener('mousedown', host.onCanvasMouseDown);
        host.canvas.removeEventListener('contextmenu', host.onCanvasContextMenu);
        host.canvas.removeEventListener('mousemove', host.onCanvasMouseMove);
        host.canvas.removeEventListener('touchstart', host.onCanvasTouchStart);
        host.canvas.removeEventListener('touchmove', host.onCanvasTouchMove);
        host.canvas.removeEventListener('touchend', host.onCanvasTouchEnd);
        host.canvas.removeEventListener('touchcancel', host.onCanvasTouchCancel);
        host.canvas.removeEventListener('keydown', host.onCanvasKeyDown);
        host.canvas.removeEventListener('dragenter', host.onCanvasDragEnter);
        host.canvas.removeEventListener('dragover', host.onCanvasDragOver);
        host.canvas.removeEventListener('dragleave', host.onCanvasDragLeave);
        host.canvas.removeEventListener('drop', host.onCanvasDrop);

        const element = host.canvas.parentElement;
        if (element) {
            element.removeChild(host.canvas);
        }

        host.clearControllerEvents();
        host.canvas = undefined;
    }

    public setAutoPixelRatio(host: DesignCanvasLifecycleHost, enabled: boolean, pixelRatio?: number): void {
        host.autoPixelRatio = enabled;
        if (enabled) {
            host.pixelRatio = getDevicePixelRatio();
        }
        else {
            host.pixelRatio = pixelRatio !== undefined && pixelRatio > 0 ? pixelRatio : 1;
        }
        this.refreshPixelRatio(host, true);
        if (host.canvas && host.model) {
            host.draw();
        }
    }

    public setPixelRatio(host: DesignCanvasLifecycleHost, pixelRatio: number): void {
        host.autoPixelRatio = false;
        host.pixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
        this.refreshPixelRatio(host, true);
        if (host.canvas && host.model) {
            host.draw();
        }
    }

    public onWindowResize(host: DesignCanvasLifecycleHost): void {
        if (!host.autoPixelRatio || !host.canvas || !host.model) {
            return;
        }

        const changed = this.refreshPixelRatio(host);
        if (changed) {
            host.draw();
        }
    }

    public refreshPixelRatio(host: DesignCanvasLifecycleHost, force?: boolean): boolean {
        const nextPixelRatio = host.autoPixelRatio ? getDevicePixelRatio() : host.pixelRatio;
        const changed = force || nextPixelRatio !== host.pixelRatio;
        host.pixelRatio = nextPixelRatio;
        return this.resizeCanvas(host) || changed;
    }

    public resizeCanvas(host: DesignCanvasLifecycleHost): boolean {
        if (!host.canvas || !host.model) {
            return false;
        }

        const size = host.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        const cssWidth = size.width * host.scale;
        const cssHeight = size.height * host.scale;
        const changed = applyCanvasDisplaySize(host.canvas, cssWidth, cssHeight, host.pixelRatio);
        const element = host.canvas.parentElement;
        if (element) {
            element.style.width = cssWidth + 'px';
            element.style.height = cssHeight + 'px';
        }
        return changed;
    }
}