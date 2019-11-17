import { LocationArgs } from '../../core/location-args';
import { Point } from '../../core/point';

test('location args', () => {
    const pt = new Point(1, 2);
    const la = new LocationArgs(pt);
    if (la.location !== undefined) {
        expect(pt.equals(la.location)).toBe(true);
    }
});
