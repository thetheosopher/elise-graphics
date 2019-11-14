import { ElementCommand } from '../command/element-command';
import { IController } from '../controller/controller';
import { ErrorMessages } from '../core/error-messages';
import { TimerParameters } from '../core/timer-parameters';
import { ElementBase } from '../elements/element-base';
import { SpriteElement } from '../elements/sprite-element';
import { BitmapResource } from '../resource/bitmap-resource';

export type TransitionRenderFunction = (
    context: CanvasRenderingContext2D,
    c1: HTMLCanvasElement | undefined,
    c2: HTMLCanvasElement | undefined,
    offset: number | undefined,
    left: number | undefined,
    top: number | undefined,
    width: number | undefined,
    height: number | undefined
) => void;

export interface INamedTransitionRenderFunction {
    name: string;
    render: TransitionRenderFunction;
}

export type EasingFunction = (t: number) => number;

export interface INamedEasingFunction {
    name: string;
    ease: EasingFunction;
}

/**
 * Image transition rendering functions
 */
export class TransitionRenderer {
    public static PUSH_FRAME_TRANSITION = 'pushFrameTransition';
    public static POP_FRAME_TRANSITION = 'popFrameTransition';
    public static SPRITE_INCREMENT = 'spriteIncrement';
    public static SPRITE_TRANSITION = 'spriteTransition';

    public static renderFunctions: INamedTransitionRenderFunction[] = [
        { name: 'none', render: TransitionRenderer.renderNone },
        { name: 'fade', render: TransitionRenderer.renderFade },
        { name: 'pushLeft', render: TransitionRenderer.renderPushLeft },
        { name: 'pushRight', render: TransitionRenderer.renderPushRight },
        { name: 'pushUp', render: TransitionRenderer.renderPushUp },
        { name: 'pushDown', render: TransitionRenderer.renderPushDown },
        { name: 'wipeLeft', render: TransitionRenderer.renderWipeLeft },
        { name: 'wipeRight', render: TransitionRenderer.renderWipeRight },
        { name: 'wipeUp', render: TransitionRenderer.renderWipeUp },
        { name: 'wipeDown', render: TransitionRenderer.renderWipeDown },
        { name: 'slideLeft', render: TransitionRenderer.renderSlideLeft },
        { name: 'slideRight', render: TransitionRenderer.renderSlideRight },
        { name: 'slideUp', render: TransitionRenderer.renderSlideUp },
        { name: 'slideDown', render: TransitionRenderer.renderSlideDown },
        { name: 'slideLeftDown', render: TransitionRenderer.renderSlideLeftDown },
        { name: 'slideRightDown', render: TransitionRenderer.renderSlideRightDown },
        { name: 'slideLeftUp', render: TransitionRenderer.renderSlideLeftUp },
        { name: 'slideRightUp', render: TransitionRenderer.renderSlideRightUp },
        { name: 'revealLeft', render: TransitionRenderer.renderRevealLeft },
        { name: 'revealRight', render: TransitionRenderer.renderRevealRight },
        { name: 'revealUp', render: TransitionRenderer.renderRevealUp },
        { name: 'revealDown', render: TransitionRenderer.renderRevealDown },
        { name: 'revealLeftDown', render: TransitionRenderer.renderRevealLeftDown },
        { name: 'revealRightDown', render: TransitionRenderer.renderRevealRightDown },
        { name: 'revealLeftUp', render: TransitionRenderer.renderRevealLeftUp },
        { name: 'revealRightUp', render: TransitionRenderer.renderRevealRightUp },
        { name: 'ellipticalIn', render: TransitionRenderer.renderEllipticalIn },
        { name: 'ellipticalOut', render: TransitionRenderer.renderEllipticalOut },
        { name: 'rectangularIn', render: TransitionRenderer.renderRectangularIn },
        { name: 'rectangularOut', render: TransitionRenderer.renderRectangularOut },
        { name: 'grid', render: TransitionRenderer.renderGrid },
        { name: 'expandHorizontal', render: TransitionRenderer.renderExpandHorizontal },
        { name: 'expandVertical', render: TransitionRenderer.renderExpandVertical },
        { name: 'zoomIn', render: TransitionRenderer.renderZoomIn },
        { name: 'zoomOut', render: TransitionRenderer.renderZoomOut },
        { name: 'zoomRotateIn', render: TransitionRenderer.renderZoomRotateIn },
        { name: 'zoomRotateOut', render: TransitionRenderer.renderZoomRotateOut },
        { name: 'radar', render: TransitionRenderer.renderRadar }
    ];

    public static easingFunctions: INamedEasingFunction[] = [
        { name: 'easeLinear', ease: TransitionRenderer.easeLinear },
        { name: 'easeInQuad', ease: TransitionRenderer.easeInQuad },
        { name: 'easeOutQuad', ease: TransitionRenderer.easeOutQuad },
        { name: 'easeInOutQuad', ease: TransitionRenderer.easeInOutQuad },
        { name: 'easeInCubic', ease: TransitionRenderer.easeInCubic },
        { name: 'easeOutCubic', ease: TransitionRenderer.easeOutCubic },
        { name: 'easeInOutCubic', ease: TransitionRenderer.easeInOutCubic },
        { name: 'easeInQuart', ease: TransitionRenderer.easeInQuart },
        { name: 'easeOutQuart', ease: TransitionRenderer.easeOutQuart },
        { name: 'easeInOutQuart', ease: TransitionRenderer.easeInOutQuart },
        { name: 'easeInQuint', ease: TransitionRenderer.easeInQuint },
        { name: 'easeOutQuint', ease: TransitionRenderer.easeOutQuint },
        { name: 'easeInOutQuint', ease: TransitionRenderer.easeInOutQuint }
    ];

    public static transitionSprite(
        controller: IController,
        sprite: SpriteElement,
        sourceFrame: number,
        targetFrame: number,
        transition: string
    ) {
        const size = sprite.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (!sprite.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!sprite.frames) {
            return;
        }
        if (!sprite.c2) {
            sprite.c2 = document.createElement('canvas');
            sprite.c2.width = size.width;
            sprite.c2.height = size.height;
        }
        if (!sprite.c1) {
            sprite.c1 = document.createElement('canvas');
            sprite.c1.width = size.width;
            sprite.c1.height = size.height;
        }

        if (sprite.c1index === undefined || sprite.c1index !== sourceFrame) {
            const c = sprite.c1.getContext('2d');
            const f = sprite.frames[sourceFrame];
            const r = sprite.model.resourceManager.get(f.source) as BitmapResource;
            if (c && r.image) {
                c.clearRect(0, 0, size.width, size.height);
                c.drawImage(r.image, f.x, f.y, f.width, f.height, 0, 0, size.width, size.height);
            }
            sprite.c1index = sourceFrame;
        }
        if (sprite.c2index !== undefined || sprite.c2index !== targetFrame) {
            const c = sprite.c2.getContext('2d');
            const f = sprite.frames[targetFrame];
            const r = sprite.model.resourceManager.get(f.source) as BitmapResource;
            if (c && r.image) {
                c.clearRect(0, 0, size.width, size.height);
                c.drawImage(r.image, f.x, f.y, f.width, f.height, 0, 0, size.width, size.height);
            }
            sprite.c2index = targetFrame;
        }
        sprite.transition = TransitionRenderer.getRenderFunction(transition);
        // sprite.transitionOffset = spriteState.offset;

        // Animate on timer
        if (sprite.timerHandle) {
            clearInterval(sprite.timerHandle);
        }
        let offset = 0;
        sprite.timerHandle = setInterval(() => {
            offset += 0.075;
            if (offset >= 1.0) {
                if (sprite.timerHandle !== undefined) {
                    clearInterval(sprite.timerHandle);
                    sprite.timerHandle = undefined;
                }
                sprite.frameIndex = targetFrame;
                sprite.transition = undefined;
                sprite.transitionOffset = undefined;
                sprite.c1index = undefined;
                sprite.c2index = undefined;
                sprite.c2 = undefined;
                sprite.c1 = undefined;
                controller.draw();
            }
            else {
                sprite.transitionOffset = TransitionRenderer.getEasingFunction('easeInOutCubic')(offset);
                controller.draw();
            }
        }, 15);
    }

    public static pushFrameTransition(
        c: IController,
        el: SpriteElement,
        command: string,
        trigger: string,
        parameters: any
    ) {
        if (!el.frameStack) {
            el.frameStack = [];
        }
        el.frameStack.push(el.frameIndex);
        const ec: ElementCommand = ElementCommand.parse(command);
        const sourceFrame: number = el.frameIndex;
        const targetFrame: number = parseInt(ec.parameter, 10);
        TransitionRenderer.transitionSprite(c, el, sourceFrame, targetFrame, 'fade');
    }

    public static popFrameTransition(
        c: IController,
        el: SpriteElement,
        command: string,
        trigger: string,
        parameters: any
    ) {
        if (!el.frameStack) {
            return;
        }
        const sourceFrame: number = el.frameIndex;
        let targetFrame: number = sourceFrame;
        if (el.frameStack.length > 0) {
            const frame = el.frameStack.pop();
            if (frame) {
                targetFrame = frame;
            }
        }
        if (el.frameStack.length === 0) {
            el.frameStack = undefined;
        }
        TransitionRenderer.transitionSprite(c, el, sourceFrame, targetFrame, 'fade');
    }

    public static spriteIncrementHandler(
        c: IController,
        el: SpriteElement,
        command: string,
        trigger: string,
        parameters: TimerParameters
    ) {
        const sprite = el;
        const time = parameters.elapsedTime;
        const spriteState = sprite.getStateForTime(time);
        if (!spriteState) {
            return;
        }
        if (sprite.frameIndex !== spriteState.frame1) {
            sprite.frameIndex = spriteState.frame1;
            c.invalidate();
        }
    }

    public static renderNone(
        context: CanvasRenderingContext2D,
        c1?: HTMLCanvasElement,
        c2?: HTMLCanvasElement,
        offset?: number,
        left?: number,
        top?: number,
        width?: number,
        height?: number
    ): void {
        if (c1 && left !== undefined && top !== undefined && width !== undefined && height !== undefined) {
            context.drawImage(c1, left, top, width, height);
        }
    }

    public static renderFade(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.globalAlpha = 1.0;
        context.drawImage(c1, left, top, width, height);
        context.globalAlpha = offset;
        context.drawImage(c2, left, top, width, height);
    }

    public static renderPushLeft(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c2, left + width - offsetX, top);
        context.drawImage(c1, left - offsetX, top);
    }

    public static renderPushRight(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c2, left - width + offsetX, top);
        context.drawImage(c1, left + offsetX, top);
    }

    public static renderPushUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c2, left, top + height - offsetY);
        context.drawImage(c1, left, top - offsetY);
    }

    public static renderPushDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c2, left, top - height + offsetY);
        context.drawImage(c1, left, top + offsetY);
    }

    public static renderWipeLeft(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c1, left, top);
        if (offsetX >= 1) {
            context.drawImage(c2, width - offsetX, 0, offsetX, height, left + width - offsetX, top, offsetX, height);
        }
    }

    public static renderWipeRight(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c1, left, top);
        if (offsetX >= 1) {
            context.drawImage(c2, 0, 0, offsetX, height, left, top, offsetX, height);
        }
    }

    public static renderWipeUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        if (offsetY >= 1) {
            context.drawImage(c2, 0, height - offsetY, width, offsetY, left, top + height - offsetY, width, offsetY);
        }
    }

    public static renderWipeDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        if (offsetY >= 1) {
            context.drawImage(c2, 0, 0, width, offsetY, left, top, width, offsetY);
        }
    }

    public static renderSlideLeft(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left + width - offsetX, top);
    }

    public static renderSlideRight(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left - width + offsetX, top);
    }

    public static renderSlideUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left, top + height - offsetY);
    }

    public static renderSlideDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left, top - height + offsetY);
    }

    public static renderSlideLeftDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left + width - offsetX, top - height + offsetY);
    }

    public static renderSlideRightDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left - width + offsetX, top - height + offsetY);
    }

    public static renderSlideLeftUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left + width - offsetX, top + height - offsetY);
    }

    public static renderSlideRightUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c1, left, top);
        context.drawImage(c2, left - width + offsetX, top + height - offsetY);
    }

    public static renderRevealLeft(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left - offsetX, top);
    }

    public static renderRevealRight(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left + offsetX, top);
    }

    public static renderRevealUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left, top - offsetY);
    }

    public static renderRevealDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left, top + offsetY);
    }

    public static renderRevealLeftDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left - offsetX, top + offsetY);
    }

    public static renderRevealRightDown(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left + offsetX, top + offsetY);
    }

    public static renderRevealLeftUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left - offsetX, top - offsetY);
    }

    public static renderRevealRightUp(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const offsetX = offset * width;
        const offsetY = offset * height;
        context.drawImage(c2, left, top);
        context.drawImage(c1, left + offsetX, top - offsetY);
    }

    public static renderEllipticalOut(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        context.beginPath();
        const w = Math.round(width * offset);
        const h = Math.round(height * offset);
        const rw = w * 1.414;
        const rh = h * 1.414;
        const cx = left + width / 2;
        const cy = top + height / 2;
        let x;
        let y;
        let ox;
        let oy;
        let xe;
        let ye;
        let xm;
        let ym;
        const kappa = 0.5522848;
        x = cx - rw / 2;
        y = cy - rh / 2;
        ox = rw / 2 * kappa; // control point offset horizontal
        oy = rh / 2 * kappa; // control point offset vertical
        xe = x + rw; // x-end
        ye = y + rh; // y-end
        xm = x + rw / 2; // x-middle
        ym = y + rh / 2; // y-middle
        context.moveTo(x, ym);
        context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        context.clip();
        context.drawImage(c2, left, top);
    }

    public static renderEllipticalIn(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c2, left, top);
        context.beginPath();
        const w = Math.round(width * (1.0 - offset));
        const h = Math.round(height * (1.0 - offset));
        const rw = w * 1.414;
        const rh = h * 1.414;
        const cx = left + width / 2;
        const cy = top + height / 2;
        let x;
        let y;
        let ox;
        let oy;
        let xe;
        let ye;
        let xm;
        let ym;
        const kappa = 0.5522848;
        x = cx - rw / 2;
        y = cy - rh / 2;
        ox = rw / 2 * kappa; // control point offset horizontal
        oy = rh / 2 * kappa; // control point offset vertical
        xe = x + rw; // x-end
        ye = y + rh; // y-end
        xm = x + rw / 2; // x-middle
        ym = y + rh / 2; // y-middle
        context.moveTo(x, ym);
        context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        context.clip();
        context.drawImage(c1, left, top);
    }

    public static renderRectangularIn(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c2, left, top);
        context.beginPath();
        const rw = width / 2.0 * (1.0 - offset);
        const rh = height / 2.0 * (1.0 - offset);
        context.moveTo(left + width / 2 - rw, top + height / 2 - rh);
        context.lineTo(left + width / 2 + rw, top + height / 2 - rh);
        context.lineTo(left + width / 2 + rw, top + height / 2 + rh);
        context.lineTo(left + width / 2 - rw, top + height / 2 + rh);
        context.clip();
        context.drawImage(c1, left, top);
    }

    public static renderRectangularOut(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        context.beginPath();
        const rw = width / 2.0 * offset;
        const rh = height / 2.0 * offset;
        context.moveTo(left + width / 2 - rw, top + height / 2 - rh);
        context.lineTo(left + width / 2 + rw, top + height / 2 - rh);
        context.lineTo(left + width / 2 + rw, top + height / 2 + rh);
        context.lineTo(left + width / 2 - rw, top + height / 2 + rh);
        context.clip();
        context.drawImage(c2, left, top);
    }

    public static renderGrid(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        context.beginPath();
        const hdiv = 8;
        const vdiv = 6;
        const rw = width / (hdiv * 2) * offset;
        const rh = height / (vdiv * 2) * offset;
        const cx = width / hdiv;
        const cy = height / vdiv;
        let i;
        let j;
        let x;
        let y;
        for (j = 0; j < vdiv; j++) {
            for (i = 0; i < hdiv; i++) {
                x = left + i * cx + cx / 2;
                y = top + j * cy + cy / 2;
                context.moveTo(x - rw, y - rh);
                context.lineTo(x + rw, y - rh);
                context.lineTo(x + rw, y + rh);
                context.lineTo(x - rw, y + rh);
            }
        }
        context.clip();
        context.drawImage(c2, left, top);
    }

    public static renderExpandHorizontal(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        const destinationWidth = width * offset;
        if (destinationWidth > 0) {
            context.drawImage(c2, left + (width - destinationWidth) / 2, top, destinationWidth, height);
        }
    }

    public static renderExpandVertical(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        const destinationHeight = height * offset;
        if (destinationHeight > 0) {
            context.drawImage(c2, left, top + (height - destinationHeight) / 2, width, destinationHeight);
        }
    }

    public static renderZoomIn(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        const destinationWidth = width * offset;
        const destinationHeight = height * offset;
        if (destinationHeight > 0) {
            context.drawImage(
                c2,
                left + (width - destinationWidth) / 2,
                top + (height - destinationHeight) / 2,
                destinationWidth,
                destinationHeight
            );
        }
    }

    public static renderZoomOut(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c2, left, top);
        const destinationWidth = width * (1 - offset);
        const destinationHeight = height * (1 - offset);
        if (destinationHeight > 0) {
            context.drawImage(
                c1,
                left + (width - destinationWidth) / 2,
                top + (height - destinationHeight) / 2,
                destinationWidth,
                destinationHeight
            );
        }
    }

    public static renderZoomRotateIn(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        const destinationWidth = width * offset;
        const destinationHeight = height * offset;
        const angle = offset * Math.PI * 2;
        if (destinationHeight > 0) {
            context.translate(left + width / 2, top + height / 2);
            context.rotate(angle);
            context.translate(-(left + width / 2), -(top + height / 2));
            context.drawImage(
                c2,
                left + (width - destinationWidth) / 2,
                top + (height - destinationHeight) / 2,
                destinationWidth,
                destinationHeight
            );
        }
    }

    public static renderZoomRotateOut(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c2, left, top);
        const destinationWidth = width * (1 - offset);
        const destinationHeight = height * (1 - offset);
        const angle = (1 - offset) * Math.PI * 2;
        if (destinationHeight > 0) {
            context.translate(left + width / 2, top + height / 2);
            context.rotate(angle);
            context.translate(-(left + width / 2), -(top + height / 2));
            context.drawImage(
                c1,
                left + (width - destinationWidth) / 2,
                top + (height - destinationHeight) / 2,
                destinationWidth,
                destinationHeight
            );
        }
    }

    public static renderRadar(
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        context.drawImage(c1, left, top);
        context.beginPath();
        context.moveTo(left + width / 2, top + height / 2);
        let angle = 0;
        let x1;
        let y1;
        for (angle = 0; angle <= Math.PI * 2; angle += 0.001) {
            x1 = left + Math.cos(angle * offset) * width;
            y1 = top + Math.sin(angle * offset) * height;
            context.lineTo(x1 + width / 2, y1 + height / 2);
        }
        context.closePath();
        context.clip();
        context.drawImage(c2, left, top);
    }

    //
    // Easing functions
    //

    // No easing, no acceleration
    public static easeLinear(t: number) {
        return t;
    }

    // Accelaration from zero velocity
    public static easeInQuad(t: number) {
        return t * t;
    }

    // Deceleration to zero velocity
    public static easeOutQuad(t: number) {
        return t * (2 - t);
    }

    // Acceleration until halfway, then Deceleration
    public static easeInOutQuad(t: number) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // Acceleration from zero velocity
    public static easeInCubic(t: number) {
        return t * t * t;
    }

    // Deceleration to zero velocity
    public static easeOutCubic(t: number) {
        return --t * t * t + 1;
    }

    // Acceleration until halfway, then deceleration
    public static easeInOutCubic(t: number) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    // Acceleration from zero velocity
    public static easeInQuart(t: number) {
        return t * t * t * t;
    }

    // Deceleration to zero velocity
    public static easeOutQuart(t: number) {
        return 1 - --t * t * t * t;
    }

    // Acceleration until halfway, then deceleration
    public static easeInOutQuart(t: number) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
    }

    // Acceleration from zero velocity
    public static easeInQuint(t: number) {
        return t * t * t * t * t;
    }

    // Deceleration to zero velocity
    public static easeOutQuint(t: number) {
        return 1 + --t * t * t * t * t;
    }

    // Acceleration until halfway, then deceleration
    public static easeInOutQuint(t: number) {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
    }

    public static getRenderFunction(name: string): TransitionRenderFunction {
        if (!name) {
            return this.renderNone;
        }
        for (const renderFunction of TransitionRenderer.renderFunctions) {
            if (renderFunction.name.toLocaleLowerCase() === name.toLocaleLowerCase()) {
                return renderFunction.render;
            }
        }
        return this.renderNone;
    }

    public static getEasingFunction(name: string): EasingFunction {
        for (const easingFunction of TransitionRenderer.easingFunctions) {
            if (easingFunction.name.toLocaleLowerCase() === name.toLocaleLowerCase()) {
                return easingFunction.ease;
            }
        }
        return TransitionRenderer.easeLinear;
    }

    public static renderTransition(
        name: string,
        context: CanvasRenderingContext2D,
        c1: HTMLCanvasElement,
        c2: HTMLCanvasElement,
        offset: number,
        left: number,
        top: number,
        width: number,
        height: number
    ): void {
        const renderFunction: TransitionRenderFunction = TransitionRenderer.getRenderFunction(name);
        renderFunction(context, c1, c2, offset, left, top, width, height);
    }

    //
    // Command Implementations
    //

    public static spriteTransitionHandler(
        controller: IController,
        element: ElementBase,
        command: string,
        trigger: string,
        parameters: any
    ) {
        const sprite = element as SpriteElement;
        if (!sprite) {
            return;
        }
        const time = parameters.elapsedTime;

        const spriteState = sprite.getStateForTime(time);
        if (!spriteState) {
            return;
        }

        // If no transition
        if (!spriteState.transition) {
            if (sprite.transition || sprite.frameIndex !== spriteState.frame1) {
                sprite.frameIndex = spriteState.frame1;
                sprite.transition = undefined;
                sprite.transitionOffset = undefined;
                sprite.c1index = undefined;
                sprite.c2index = undefined;
                sprite.c2 = undefined;
                sprite.c1 = undefined;
                controller.invalidate();
                if (sprite.onAdvance && controller.commandHandler) {
                    controller.commandHandler.onElementCommandFired(
                        controller,
                        element,
                        sprite.onAdvance,
                        trigger,
                        parameters
                    );
                }
            }
        }
        else {
            // Transition active
            const size = sprite.getSize();
            if (!size || !sprite.frames || !sprite.model) {
                return;
            }
            if (!sprite.c2) {
                sprite.c2 = document.createElement('canvas');
                sprite.c2.width = size.width;
                sprite.c2.height = size.height;
            }
            if (!sprite.c1) {
                sprite.c1 = document.createElement('canvas');
                sprite.c1.width = size.width;
                sprite.c1.height = size.height;
            }

            if (sprite.c1index === undefined || sprite.c1index !== spriteState.frame1) {
                const c = sprite.c1.getContext('2d');
                if (!c) {
                    return;
                }
                const f = sprite.frames[spriteState.frame1];
                const r = sprite.model.resourceManager.get(f.source) as BitmapResource;
                if (!r || !r.image) {
                    return;
                }
                c.clearRect(0, 0, size.width, size.height);
                c.drawImage(r.image, f.x, f.y, f.width, f.height, 0, 0, size.width, size.height);
                sprite.c1index = spriteState.frame1;
            }
            if (sprite.c2index === undefined || sprite.c2index !== spriteState.frame2) {
                const c = sprite.c2.getContext('2d');
                if (!c) {
                    return;
                }
                const f = sprite.frames[spriteState.frame2];
                const r = sprite.model.resourceManager.get(f.source) as BitmapResource;
                c.clearRect(0, 0, size.width, size.height);
                if (!r || !r.image) {
                    return;
                }
                c.drawImage(r.image, f.x, f.y, f.width, f.height, 0, 0, size.width, size.height);
                sprite.c2index = spriteState.frame2;
            }

            sprite.transition = TransitionRenderer.getRenderFunction(spriteState.transition);
            // sprite.transitionOffset = spriteState.offset;
            sprite.transitionOffset = TransitionRenderer.getEasingFunction('easeInOutCubic')(spriteState.offset);

            controller.invalidate();
        }
    }
}
