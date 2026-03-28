import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';
import { SVGViewController } from '../../view/svg-view-controller';

type FakeElement = {
    tagName: string;
    style: Record<string, string>;
    outerHTML: string;
    parentElement?: FakeElement;
    firstChild?: FakeElement;
    textContent?: string;
    appendChild: (child: FakeElement) => FakeElement;
    replaceChild: (nextChild: FakeElement, currentChild: FakeElement) => FakeElement;
    removeChild: (child: FakeElement) => FakeElement;
    querySelector: (selector: string) => FakeElement | null;
    setAttribute: (name: string, value: string) => void;
};

function installFakeWindow() {
    const globals = globalThis as unknown as { window?: any };
    const originalWindow = globals.window;
    const fakeWindow = {
        requestAnimationFrame: jest.fn(() => 101),
        cancelAnimationFrame: jest.fn(),
    };
    globals.window = fakeWindow;
    return {
        fakeWindow,
        restore: () => {
            globals.window = originalWindow;
        }
    };
}

function createFakeElement(tagName: string, outerHTML?: string): FakeElement {
    return {
        tagName,
        style: {},
        outerHTML: outerHTML || '<' + tagName + '></' + tagName + '>',
        appendChild(child: FakeElement) {
            this.firstChild = child;
            child.parentElement = this;
            return child;
        },
        replaceChild(nextChild: FakeElement, currentChild: FakeElement) {
            if (this.firstChild === currentChild) {
                this.firstChild = nextChild;
                nextChild.parentElement = this;
                currentChild.parentElement = undefined;
            }
            return currentChild;
        },
        removeChild(child: FakeElement) {
            if (this.firstChild === child) {
                this.firstChild = undefined;
                child.parentElement = undefined;
            }
            return child;
        },
        querySelector(selector: string) {
            if (selector === 'svg' && this.firstChild && this.firstChild.tagName.toLowerCase() === 'svg') {
                return this.firstChild;
            }
            return null;
        },
        setAttribute(name: string, value: string) {
            void name;
            void value;
        },
    };
}

function installFakeDocument() {
    const globals = globalThis as unknown as {
        document?: any;
        DOMParser?: any;
    };
    const originalDocument = globals.document;
    const originalDOMParser = globals.DOMParser;

    class FakeDOMParser {
        public parseFromString(markup: string) {
            return {
                documentElement: createFakeElement('svg', markup),
            };
        }
    }

    const fakeDocument = {
        createElement: jest.fn((tagName: string) => createFakeElement(tagName)),
        createElementNS: jest.fn((_namespace: string, tagName: string) => createFakeElement(tagName)),
        importNode: jest.fn((node: FakeElement) => createFakeElement(node.tagName, node.outerHTML)),
    };

    globals.document = fakeDocument;
    globals.DOMParser = FakeDOMParser;

    return {
        restore: () => {
            globals.document = originalDocument;
            globals.DOMParser = originalDOMParser;
        }
    };
}

test('svg view controller initializeTarget mounts scaled svg output', () => {
    const fakeDocumentScope = installFakeDocument();
    const host = document.createElement('div') as unknown as FakeElement;
    const model = Model.create(20, 10);
    model.add(RectangleElement.create(1, 2, 3, 4).setFill('#112233'));

    const controller = SVGViewController.initializeTarget(host as unknown as HTMLDivElement, model, 2);

    const svg = host.querySelector('svg');
    expect(controller.getSVG()).toBe(svg);
    expect(svg).not.toBeNull();
    expect(host.style.width).toBe('40px');
    expect(host.style.height).toBe('20px');
    expect(svg!.outerHTML).toContain('width="20"');
    expect(svg!.outerHTML).toContain('fill="#112233"');
    fakeDocumentScope.restore();
});

test('svg view controller draw refreshes mounted markup after model changes', () => {
    const fakeDocumentScope = installFakeDocument();
    const host = document.createElement('div') as unknown as FakeElement;
    const model = Model.create(30, 20);
    const rectangle = RectangleElement.create(2, 3, 10, 5).setFill('#112233');
    model.add(rectangle);

    const controller = SVGViewController.initializeTarget(host as unknown as HTMLDivElement, model);
    expect(controller.getSVG().outerHTML).toContain('fill="#112233"');

    rectangle.setFill('#445566');
    controller.draw();

    expect(controller.getSVG().outerHTML).toContain('fill="#445566"');
    fakeDocumentScope.restore();
});

test('svg view controller timer lifecycle start pause resume stop', () => {
    const controller = new SVGViewController();
    const fakeWindowScope = installFakeWindow();
    const { fakeWindow } = fakeWindowScope;

    controller.startTimer();

    expect(controller.timerEnabled).toBe(true);
    expect(controller.timerHandle).toBe(101);

    controller.pauseTimer();

    expect(controller.timerEnabled).toBe(false);
    expect(controller.timerHandle).toBeUndefined();
    expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalledWith(101);

    controller.resumeTimer();

    expect(controller.timerEnabled).toBe(true);
    expect(controller.timerHandle).toBe(101);

    controller.stopTimer();

    expect(controller.timerEnabled).toBe(false);
    expect(controller.timerHandle).toBeUndefined();
    fakeWindowScope.restore();
});

test('svg view controller tick redraws when timer handlers invalidate', () => {
    const controller = new SVGViewController();
    const fakeWindowScope = installFakeWindow();
    const drawSpy = jest.spyOn(controller, 'draw').mockImplementation(() => undefined);

    controller.timer.add(() => {
        controller.invalidate();
    });
    controller.timerEnabled = true;

    controller.tick();

    expect(drawSpy).toHaveBeenCalledTimes(1);
    expect(controller.timerHandle).toBe(101);

    drawSpy.mockRestore();
    fakeWindowScope.restore();
});

test('svg view controller detach removes mounted svg and clears controller reference', () => {
    const fakeDocumentScope = installFakeDocument();
    const host = document.createElement('div') as unknown as FakeElement;
    const model = Model.create(24, 12);
    model.add(RectangleElement.create(0, 0, 24, 12).setFill('#abcdef'));
    const controller = SVGViewController.initializeTarget(host as unknown as HTMLDivElement, model);

    controller.detach();

    expect(host.querySelector('svg')).toBeNull();
    expect(controller.svg).toBeUndefined();
    expect(model.controller).toBeUndefined();
    fakeDocumentScope.restore();
});