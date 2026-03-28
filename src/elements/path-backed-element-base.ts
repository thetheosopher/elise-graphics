import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { IPointContainer } from '../core/point-container';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';
import { commandsBounds } from './primitive-shape-utils';
import { tracePathCommands } from './path-command-utils';

export abstract class PathBackedElementBase extends ElementBase implements IPointContainer {
    public editPoints: boolean = false;

    protected bounds?: Region;

    protected constructor(type: string) {
        super(type);
    }

    public abstract pointCount(): number;

    public abstract getPointAt(index: number, depth?: PointDepth): Point;

    public abstract setPointAt(index: number, value: Point, depth: PointDepth): void;

    protected abstract buildPathCommands(): string[];

    protected getPathWinding(): WindingMode {
        return WindingMode.NonZero;
    }

    public toPathCommands(): string[] {
        return this.buildPathCommands().slice();
    }

    public clearBounds() {
        this.bounds = undefined;
    }

    public getLocation(): Point | undefined {
        return this._location;
    }

    public getSize(): Size | undefined {
        return this._size;
    }

    public setLocation(pointSource: string | Point) {
        this.bounds = undefined;
        return super.setLocation(pointSource);
    }

    public setSize(sizeSource: string | Size) {
        this.bounds = undefined;
        return super.setSize(sizeSource);
    }

    public translate(offsetX: number, offsetY: number) {
        this.bounds = undefined;
        return super.translate(offsetX, offsetY);
    }

    public scale(scaleX: number, scaleY: number) {
        this.bounds = undefined;
        return super.scale(scaleX, scaleY);
    }

    public nudgeSize(widthDelta: number, heightDelta: number) {
        this.bounds = undefined;
        return super.nudgeSize(widthDelta, heightDelta);
    }

    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const location = this.getLocation();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, location);
        }
        this.applyRenderOpacity(c);
        this.withClipPath(c, () => {
            c.beginPath();
            tracePathCommands(c, this.buildPathCommands());
            if (this.canFill() && FillFactory.setElementFill(c, this)) {
                if (this.fillOffsetX || this.fillOffsetY) {
                    const fillOffsetX = this.fillOffsetX || 0;
                    const fillOffsetY = this.fillOffsetY || 0;
                    c.translate(location.x + fillOffsetX, location.y + fillOffsetY);
                    c.fill(this.getPathWinding() === WindingMode.EvenOdd ? 'evenodd' : 'nonzero');
                    c.translate(-(location.x + fillOffsetX), -(location.y + fillOffsetY));
                }
                else {
                    c.translate(location.x, location.y);
                    c.fill(this.getPathWinding() === WindingMode.EvenOdd ? 'evenodd' : 'nonzero');
                    c.translate(-location.x, -location.y);
                }
            }
            if (model.setElementStroke(c, this)) {
                c.stroke();
            }
        });
        c.restore();
    }

    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const location = this.getLocation();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, location);
        }
        c.beginPath();
        tracePathCommands(c, this.buildPathCommands());
        let hit = false;
        if (this.canFill() && this.fill) {
            hit = this.getPathWinding() === WindingMode.EvenOdd ? c.isPointInPath(tx, ty, 'evenodd') : c.isPointInPath(tx, ty, 'nonzero');
        }
        else if (typeof c.isPointInStroke === 'function') {
            hit = c.isPointInStroke(tx, ty);
        }
        c.restore();

        if (!hit) {
            return false;
        }
        return this.isPointWithinClipPath(c, tx, ty);
    }

    public getBounds(): Region | undefined {
        if (this.bounds) {
            return this.bounds;
        }

        const bounds = commandsBounds(this.buildPathCommands());
        if (!bounds) {
            return undefined;
        }

        this.bounds = bounds;
        return bounds;
    }

    public canStroke(): boolean {
        return true;
    }

    public canResize(): boolean {
        return !this.editPoints;
    }

    public canMovePoint(): boolean {
        return this.editPoints;
    }

    public canEditPoints(): boolean {
        return true;
    }
}