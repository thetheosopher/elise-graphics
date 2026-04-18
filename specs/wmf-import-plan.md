# WMF Importer — TypeScript Port Plan

## Problem

Port the C# `MetafileImporter` (which converts WMF metafiles to the Elise model format) to TypeScript for integration into the `elise-npm` library. The C# version relies on `System.Drawing.Imaging.Metafile` and `Graphics.EnumerateMetafile()` for WMF binary parsing — neither exists in JS/TS. We must implement a pure-TypeScript WMF binary parser alongside the record-handling/conversion logic.

## Approach

Create a new `wmf/` module inside `elise-npm/src/` (alongside the existing `svg/` module) following the same structural patterns as the SVG importer. The work breaks down into six phases:

1. **WMF binary parser** — Read WMF headers and iterate records from an `ArrayBuffer`
2. **GDI type definitions** — Port enums and struct types from `WinGDI.cs`
3. **GDI state machine** — Object table, current pen/brush/font, coordinate transform state
4. **Shape record handlers** — Convert each WMF drawing record to Elise elements
5. **Arc/Chord/Pie math** — Pure-math arc-to-cubic-bézier conversion (replaces GDI+ `GraphicsPath`)
6. **Public API + tests** — `WmfImporter.parse(buffer): Model` entry point, unit tests

## Target Location

```
elise-npm/src/wmf/
├── wmf-importer.ts       # Public API: WmfImporter.parse(buffer) → Model
├── wmf-parser.ts         # Binary WMF header + record reader
├── wmf-types.ts          # Enums (record types, brush/pen/hatch styles) + struct interfaces
├── gdi-state.ts          # GDI object table + DC state (current fill, stroke, font, position, etc.)
├── arc-utils.ts          # Arc/Chord/Pie → cubic bézier path commands
└── __tests__/
    └── wmf-importer.test.ts
```

Re-export from `elise-npm/src/index.ts`.

## Detailed Todos

### Phase 1: WMF Types (`wmf-types.ts`)
Port enums and interfaces from `WinGDI.cs`:
- `WmfRecordType` enum — record type constants (0x0201 SetWindowOrg, 0x020C SetWindowExt, 0x0324 Polygon, etc.)
- `GdiBrushStyle` enum (BS_SOLID, BS_HOLLOW, BS_HATCHED, etc.)
- `GdiPenStyle` enum (PS_SOLID, PS_DASH, PS_DOT, PS_NULL, PS_INSIDEFRAME, etc.)
- `GdiHatchStyle` enum (HS_HORIZONTAL through HS_DIAGCROSS)
- `GdiTextAlignFlags` constants
- Interfaces: `LogBrush`, `LogPen`, `LogFont`, `ColorRef`
- Helper: `colorRefToString(c: ColorRef): string` → `"#RRGGBB"` for Elise fill/stroke

### Phase 2: WMF Binary Parser (`wmf-parser.ts`)
Read the WMF binary format from an `ArrayBuffer`/`Uint8Array`:
- Parse WMF header (file type, header size, version, file size, num objects, max record size)
- Handle both Placeable WMF (Aldus header with 22-byte prefix, bounding box, DPI) and Standard WMF
- Iterate records: each record = `{ size: uint32, type: uint16, parameters: DataView }`
- Yield/callback for each record (similar to `Graphics.EnumerateMetafile()` pattern)
- Utility readers: `readInt16`, `readUint16`, `readInt32`, `readUint32`, `readColorRef`, `readLogBrush`, `readLogPen`, `readLogFont`

### Phase 3: GDI State Machine (`gdi-state.ts`)
Port the GDI device context state from `MetafileImporter.cs`:
- **Object table**: `(Fill | Stroke | FontInfo | null)[]` — mirrors the `drawingObjects` ArrayList
  - `addObject(obj)` — finds first null slot or pushes
  - `selectObject(index)` — sets current fill/stroke/font based on object type
  - `deleteObject(index)` — nullifies slot
- **DC state**: `currentFill`, `currentStroke`, `currentFont`, `currentX`, `currentY`
- **Coordinate state**: `xOffset`, `yOffset`, `xRange`, `yRange`, `flipX`, `flipY`
- **Fill mode**: `nonZeroFill` boolean (Winding vs Alternate)
- **Text state**: `textColor`, `textAlign`, `bkMode`, `bkColor`
- **Coord transform helpers**: `fixX(x)`, `fixY(y)` — apply offset + flip

### Phase 4: Arc Utilities (`arc-utils.ts`)
Replace the C# `GraphicsPath.AddArc()` / `AddPie()` + `PathTranslator` pipeline:
- `gdiAngle(cx, cy, px, py): number` — compute GDI-style clockwise angle from a point on an ellipse (port from `Arc.cs` constructor)
- `arcToBeziers(x, y, w, h, startAngle, sweepAngle): PathCommand[]` — approximate an elliptical arc with cubic bézier segments (standard algorithm: split into ≤90° segments, compute control points)
- `arcPathCommands(x1,y1,x2,y2, xr1,yr1,xr2,yr2): string[]` — 8-param GDI arc → Elise path commands (move + béziers)
- `chordPathCommands(...)` — same + close figure (line back to start)
- `piePathCommands(...)` — same + lines from center to arc endpoints + close

### Phase 5: Shape Record Handlers (in `wmf-importer.ts`)
Port each record handler from `MetafileImporter.MetafileCallback()`:

**Coordinate/State records** (no element output):
- `SetWindowOrg` → set xOffset, yOffset
- `SetWindowExt` → detect flipX/flipY from negative extents
- `SetMapMode`, `SetBkMode`, `SetBkColor`, `SetTextColor`, `SetTextAlign`, `SetPolyFillMode`, `SetROP2`, `SetRelAbs`
- `CreateBrushIndirect`, `CreatePenIndirect`, `CreateFontIndirect` → add to object table
- `SelectObject`, `DeleteObject` → manage object table
- `MoveTo` → update currentX/currentY

**Drawing records** (produce Elise elements):
- `LineTo` → `LineElement.create(x1,y1, x2,y2)` with current stroke
- `Polygon` → `PolygonElement` with point array, current fill + stroke, nonZeroFill
- `PolyPolygon` → one `PathElement` per sub-polygon (M/L/Z commands), or a single compound path
- `Polyline` → `PolylineElement` with point array, current stroke (no fill)
- `Rectangle` → `RectangleElement.create(x,y,w,h)` with current fill + stroke
- `Ellipse` → `EllipseElement.create(cx,cy,rx,ry)` with current fill + stroke
- `Arc` → `PathElement` from `arcPathCommands()`, stroke only
- `Chord` → `PathElement` from `chordPathCommands()`, fill + stroke
- `Pie` → `PathElement` from `piePathCommands()`, fill + stroke
- `PatBlt` → `RectangleElement` with current fill, no stroke

**Deferred (match C# disabled state):**
- `TextOut` / `ExtTextOut` — text rendering (commented out in C#)
- `StretchDib` / `DibStretchBlt` — bitmap embedding (commented out in C#)

### Phase 6: Public API + Integration
- `WmfImporter.parse(buffer: ArrayBuffer): Model` — main entry point
  - Create WMF parser from buffer
  - Extract bounds/DPI from header → set model size, xOffset, yOffset, xRange, yRange
  - Initialize GDI state
  - Iterate records, dispatch to handlers
  - Return populated Model
- Export from `elise-npm/src/index.ts`
- Add unit tests using known WMF test files

## Key Technical Decisions

1. **Path command format**: Use Elise's internal lowercase format (`m`, `l`, `c`, `z`) matching `PathElement` expectations
2. **Coordinate precision**: Use floating-point throughout (no `short` truncation as in C#)
3. **Arc approximation**: Standard cubic bézier approximation (≤90° segments) — well-known algorithm, matches GDI+ output quality
4. **PolyPolygon**: Convert to a single `PathElement` with multiple M/L/Z sub-paths (matches how SVG importer handles compound paths)
5. **No GDI+ dependency**: All geometry is computed with pure math

## Notes

- The C# importer uses `Graphics.EnumerateMetafile()` with a tiny bitmap + transform trick just to trigger WMF record enumeration — we replace this entirely with our binary parser
- SaveDC/RestoreDC are marked "unsupported" in C# — skip for now, add later if needed
- Text and bitmap support can be added in a follow-up phase once the geometric primitives are working
- The existing SVG importer pattern (`SVGImporter.parse() → Model`) is the model for the public API
