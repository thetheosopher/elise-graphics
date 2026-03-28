import { Point } from '../core/point';
import { Region } from '../core/region';
import { ElementBase } from '../elements/element-base';

export interface DesignSmartAlignmentGuides {
    vertical: number[];
    horizontal: number[];
}

export interface DesignMovableSelectionEntry {
    element: ElementBase;
    bounds: Region;
    location: Point;
}

export interface DesignMovementHost {
    model?: { elements: ElementBase[]; getSize(): { width: number; height: number } | undefined };
    selectedElements: ElementBase[];
    constrainToBounds: boolean;
    snapToGrid: boolean;
    smartAlignmentEnabled: boolean;
    smartAlignmentThreshold: number;
    getNearestSnapX(newX: number): number;
    getNearestSnapY(newY: number): number;
}

const EPSILON = 2e-23;

export class DesignMovementService {
    public getSelectedMovableEntries(selectedElements: ElementBase[]): DesignMovableSelectionEntry[] {
        const entries: DesignMovableSelectionEntry[] = [];
        for (const selectedElement of selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }

            const bounds = selectedElement.getBounds();
            if (!bounds) {
                continue;
            }

            const location = selectedElement.getLocation() || bounds.location;
            entries.push({
                element: selectedElement,
                bounds,
                location: new Point(location.x, location.y),
            });
        }

        return entries;
    }

    public getBoundsForMovableEntries(entries: DesignMovableSelectionEntry[]): Region | undefined {
        if (entries.length === 0) {
            return undefined;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const entry of entries) {
            minX = Math.min(minX, entry.bounds.x);
            minY = Math.min(minY, entry.bounds.y);
            maxX = Math.max(maxX, entry.bounds.x + entry.bounds.width);
            maxY = Math.max(maxY, entry.bounds.y + entry.bounds.height);
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    public constrainMoveDeltaToBounds(host: DesignMovementHost, entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point {
        if (!host.constrainToBounds || !host.model) {
            return new Point(deltaX, deltaY);
        }

        const bounds = this.getBoundsForMovableEntries(entries);
        const modelSize = host.model.getSize();
        if (!bounds || !modelSize) {
            return new Point(deltaX, deltaY);
        }

        let constrainedX = deltaX;
        let constrainedY = deltaY;
        if (constrainedX < 0 && bounds.x + constrainedX < 0) {
            constrainedX = -bounds.x;
        }
        else if (constrainedX > 0 && bounds.x + bounds.width + constrainedX > modelSize.width) {
            constrainedX = modelSize.width - (bounds.x + bounds.width);
        }

        if (constrainedY < 0 && bounds.y + constrainedY < 0) {
            constrainedY = -bounds.y;
        }
        else if (constrainedY > 0 && bounds.y + bounds.height + constrainedY > modelSize.height) {
            constrainedY = modelSize.height - (bounds.y + bounds.height);
        }

        return new Point(constrainedX, constrainedY);
    }

    public snapMoveDeltaToGrid(host: DesignMovementHost, entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point {
        if (!host.snapToGrid) {
            return new Point(deltaX, deltaY);
        }

        const bounds = this.getBoundsForMovableEntries(entries);
        if (!bounds) {
            return new Point(deltaX, deltaY);
        }

        const snappedX = host.getNearestSnapX(bounds.x + deltaX);
        const snappedY = host.getNearestSnapY(bounds.y + deltaY);
        return new Point(snappedX - bounds.x, snappedY - bounds.y);
    }

    public getSmartAlignmentDelta(
        host: DesignMovementHost,
        entries: DesignMovableSelectionEntry[],
        deltaX: number,
        deltaY: number,
    ): { deltaX: number; deltaY: number; guides: DesignSmartAlignmentGuides } {
        const guides: DesignSmartAlignmentGuides = { vertical: [], horizontal: [] };
        if (!host.smartAlignmentEnabled || !host.model || entries.length === 0 || host.smartAlignmentThreshold < 0) {
            return { deltaX, deltaY, guides };
        }

        const selectionBounds = this.getBoundsForMovableEntries(entries);
        if (!selectionBounds) {
            return { deltaX, deltaY, guides };
        }

        const movingXs = [
            selectionBounds.x + deltaX,
            selectionBounds.x + deltaX + selectionBounds.width / 2,
            selectionBounds.x + deltaX + selectionBounds.width,
        ];
        const movingYs = [
            selectionBounds.y + deltaY,
            selectionBounds.y + deltaY + selectionBounds.height / 2,
            selectionBounds.y + deltaY + selectionBounds.height,
        ];
        const selected = new Set(entries.map((entry) => entry.element));

        let bestXAdjustment: number | undefined;
        let bestYAdjustment: number | undefined;
        let bestXGuide: number | undefined;
        let bestYGuide: number | undefined;
        let bestXDistance = host.smartAlignmentThreshold + EPSILON;
        let bestYDistance = host.smartAlignmentThreshold + EPSILON;

        for (const element of host.model.elements) {
            if (selected.has(element)) {
                continue;
            }

            const bounds = element.getBounds();
            if (!bounds) {
                continue;
            }

            const targetXs = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
            const targetYs = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

            for (const movingX of movingXs) {
                for (const targetX of targetXs) {
                    const diff = targetX - movingX;
                    const distance = Math.abs(diff);
                    if (distance <= host.smartAlignmentThreshold && distance < bestXDistance) {
                        bestXDistance = distance;
                        bestXAdjustment = diff;
                        bestXGuide = targetX;
                    }
                }
            }

            for (const movingY of movingYs) {
                for (const targetY of targetYs) {
                    const diff = targetY - movingY;
                    const distance = Math.abs(diff);
                    if (distance <= host.smartAlignmentThreshold && distance < bestYDistance) {
                        bestYDistance = distance;
                        bestYAdjustment = diff;
                        bestYGuide = targetY;
                    }
                }
            }
        }

        let nextDeltaX = deltaX;
        let nextDeltaY = deltaY;
        if (bestXAdjustment !== undefined && bestXGuide !== undefined) {
            nextDeltaX += bestXAdjustment;
            guides.vertical.push(bestXGuide);
        }
        if (bestYAdjustment !== undefined && bestYGuide !== undefined) {
            nextDeltaY += bestYAdjustment;
            guides.horizontal.push(bestYGuide);
        }

        return { deltaX: nextDeltaX, deltaY: nextDeltaY, guides };
    }
}
