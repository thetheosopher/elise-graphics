import { IMouseEvent } from '../core/mouse-event';
import { Point } from '../core/point';

export interface DesignTouchInteractionHost {
    enabled: boolean;
    canvas?: HTMLCanvasElement;
    scale: number;
    activeTouchId?: number;
    touchGestureActive: boolean;
    gestureStartDistance?: number;
    gestureStartScale?: number;
    gestureLastCenter?: Point;
    cancelAction: boolean;
    isMouseDown: boolean;
    windowTouchEnd(e: TouchEvent): void;
    windowTouchMove(e: TouchEvent): void;
    windowTouchCancel(e: TouchEvent): void;
    onCanvasMouseDown(e: MouseEvent | IMouseEvent): void;
    onCanvasMouseMove(e: MouseEvent | IMouseEvent): void;
    onCanvasMouseUp(e: MouseEvent | IMouseEvent): void;
    setScale(scale: number): void;
}

interface TouchGestureInfo {
    distance: number;
    centerX: number;
    centerY: number;
}

export class DesignTouchInteractionService {
    public onCanvasTouchStart(host: DesignTouchInteractionHost, e: TouchEvent): void {
        if (!host.enabled) {
            return;
        }
        if (!host.canvas) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('touchend', host.windowTouchEnd, true);
        window.addEventListener('touchmove', host.windowTouchMove, true);
        window.addEventListener('touchcancel', host.windowTouchCancel, true);

        if (e.touches.length >= 2) {
            const primary = e.touches[0];
            if (host.isMouseDown) {
                host.cancelAction = true;
                host.onCanvasMouseUp(this.createTouchMouseEvent(primary, e));
            }
            host.activeTouchId = undefined;
            this.beginTouchGesture(host, e);
            return;
        }

        if (host.touchGestureActive || e.touches.length !== 1) {
            return;
        }
        const touch = e.touches[0];
        host.activeTouchId = touch.identifier;
        host.onCanvasMouseDown(this.createTouchMouseEvent(touch, e));
    }

    public onCanvasTouchMove(host: DesignTouchInteractionHost, e: TouchEvent): void {
        if (!host.enabled) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        if (e.touches.length >= 2 || host.touchGestureActive) {
            if (!host.touchGestureActive) {
                this.beginTouchGesture(host, e);
            }
            this.updateTouchGesture(host, e);
            return;
        }

        if (host.activeTouchId === undefined) {
            return;
        }
        const touch = this.findTouchById(e.touches, host.activeTouchId);
        if (!touch) {
            return;
        }
        host.onCanvasMouseMove(this.createTouchMouseEvent(touch, e));
    }

    public onCanvasTouchEnd(host: DesignTouchInteractionHost, e: TouchEvent): void {
        e.preventDefault();
        e.stopPropagation();

        if (host.touchGestureActive) {
            if (e.touches.length >= 2) {
                this.updateTouchGesture(host, e);
                return;
            }
            this.endTouchGesture(host);
            return;
        }

        if (host.activeTouchId === undefined) {
            return;
        }

        const touch = this.findTouchById(e.changedTouches, host.activeTouchId);
        if (!touch) {
            return;
        }

        window.removeEventListener('touchend', host.windowTouchEnd, true);
        window.removeEventListener('touchmove', host.windowTouchMove, true);
        window.removeEventListener('touchcancel', host.windowTouchCancel, true);
        host.activeTouchId = undefined;
        host.onCanvasMouseUp(this.createTouchMouseEvent(touch, e));
    }

    public onCanvasTouchCancel(host: DesignTouchInteractionHost, e: TouchEvent): void {
        if (host.touchGestureActive) {
            this.endTouchGesture(host);
            return;
        }
        host.cancelAction = true;
        this.onCanvasTouchEnd(host, e);
    }

    private beginTouchGesture(host: DesignTouchInteractionHost, e: TouchEvent): void {
        const info = this.getTouchGestureInfo(e.touches);
        if (!info) {
            return;
        }
        host.touchGestureActive = true;
        host.gestureStartDistance = info.distance;
        host.gestureStartScale = host.scale;
        host.gestureLastCenter = new Point(info.centerX, info.centerY);
    }

    private updateTouchGesture(host: DesignTouchInteractionHost, e: TouchEvent): void {
        const info = this.getTouchGestureInfo(e.touches);
        if (!info || host.gestureStartDistance === undefined || host.gestureStartScale === undefined) {
            return;
        }
        const scale = Math.max(0.25, Math.min(8, host.gestureStartScale * (info.distance / host.gestureStartDistance)));
        host.setScale(scale);
        if (host.gestureLastCenter) {
            const panContainer = this.getGesturePanContainer(host);
            if (panContainer) {
                panContainer.scrollLeft -= info.centerX - host.gestureLastCenter.x;
                panContainer.scrollTop -= info.centerY - host.gestureLastCenter.y;
            }
        }
        host.gestureLastCenter = new Point(info.centerX, info.centerY);
    }

    private endTouchGesture(host: DesignTouchInteractionHost): void {
        host.touchGestureActive = false;
        host.gestureStartDistance = undefined;
        host.gestureStartScale = undefined;
        host.gestureLastCenter = undefined;
        host.activeTouchId = undefined;
        window.removeEventListener('touchend', host.windowTouchEnd, true);
        window.removeEventListener('touchmove', host.windowTouchMove, true);
        window.removeEventListener('touchcancel', host.windowTouchCancel, true);
    }

    private getTouchGestureInfo(touches: TouchList): TouchGestureInfo | undefined {
        if (touches.length < 2) {
            return undefined;
        }
        const t1 = touches[0];
        const t2 = touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            centerX: (t1.clientX + t2.clientX) / 2,
            centerY: (t1.clientY + t2.clientY) / 2,
        };
    }

    private getGesturePanContainer(host: DesignTouchInteractionHost): HTMLElement | undefined {
        if (!host.canvas) {
            return undefined;
        }
        const hostElement = host.canvas.parentElement;
        if (!hostElement) {
            return undefined;
        }
        const parent = hostElement.parentElement;
        if (parent) {
            return parent;
        }
        return hostElement;
    }

    private findTouchById(touches: TouchList, identifier: number): Touch | undefined {
        for (let index = 0; index < touches.length; index++) {
            const touch = touches.item(index);
            if (touch && touch.identifier === identifier) {
                return touch;
            }
        }
        return undefined;
    }

    private createTouchMouseEvent(touch: Touch, source: TouchEvent): IMouseEvent {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            altKey: false,
            preventDefault: () => source.preventDefault(),
            stopPropagation: () => source.stopPropagation(),
        };
    }
}