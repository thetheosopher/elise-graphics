import { BitmapResource } from '../../resource/bitmap-resource';
import { TextResource } from '../../resource/text-resource';
import { ModelResource } from '../../resource/model-resource';
import { ResourceFactory } from '../../resource/resource-factory';

test('bitmap resource create with uri', () => {
    const res = BitmapResource.create('logo', '/images/logo.png');
    expect(res.type).toBe('bitmap');
    expect(res.key).toBe('logo');
    expect(res.uri).toBe('/images/logo.png');
});

test('bitmap resource create with locale', () => {
    const res = BitmapResource.create('logo', '/images/logo.png', 'en-US');
    expect(res.locale).toBe('en-US');
});

test('bitmap resource serialize/parse', () => {
    const res = BitmapResource.create('logo', '/images/logo.png');
    const serialized = res.serialize();
    expect(serialized.type).toBe('bitmap');
    expect(serialized.key).toBe('logo');
    expect(serialized.uri).toBe('/images/logo.png');

    const parsed = new BitmapResource();
    parsed.parse(serialized);
    expect(parsed.key).toBe('logo');
    expect(parsed.uri).toBe('/images/logo.png');
});

test('bitmap resource clone', () => {
    const res = BitmapResource.create('logo', '/images/logo.png');
    const cloned = res.clone();
    expect(cloned.key).toBe('logo');
    expect(cloned.uri).toBe('/images/logo.png');
});

test('bitmap resource matching', () => {
    const res = BitmapResource.create('logo', '/images/logo.png', 'en-US');
    expect(res.matchesFull('logo', 'en-US')).toBe(true);
    expect(res.matchesFull('logo', 'fr-FR')).toBe(false);
    expect(res.matchesLanguage('logo', 'en')).toBe(true);
    expect(res.matchesGeneric('logo')).toBe(false); // has locale
    expect(res.matchesKey('logo')).toBe(true);
});

test('text resource create from text', () => {
    const res = TextResource.createFromText('greeting', 'Hello World');
    expect(res.type).toBe('text');
    expect(res.key).toBe('greeting');
    expect(res.text).toBe('Hello World');
});

test('text resource create from uri', () => {
    const res = TextResource.createFromUri('article', '/texts/article.txt');
    expect(res.type).toBe('text');
    expect(res.key).toBe('article');
    expect(res.uri).toBe('/texts/article.txt');
});

test('text resource serialize/parse', () => {
    const res = TextResource.createFromText('greeting', 'Hello');
    const serialized = res.serialize();
    expect(serialized.text).toBe('Hello');

    const parsed = new TextResource();
    parsed.parse(serialized);
    expect(parsed.text).toBe('Hello');
    expect(parsed.key).toBe('greeting');
});

test('text resource with locale', () => {
    const res = TextResource.createFromText('greeting', 'Bonjour', 'fr-FR');
    expect(res.locale).toBe('fr-FR');
    expect(res.matchesFull('greeting', 'fr-FR')).toBe(true);
});

test('model resource create with uri', () => {
    const res = ModelResource.create('widget', '/models/widget');
    expect(res.type).toBe('model');
    expect(res.key).toBe('widget');
    expect(res.uri).toBe('/models/widget');
});

test('resource factory creates bitmap', () => {
    const res = ResourceFactory.create('bitmap');
    expect(res).toBeDefined();
    expect(res!.type).toBe('bitmap');
});

test('resource factory creates text', () => {
    const res = ResourceFactory.create('text');
    expect(res).toBeDefined();
    expect(res!.type).toBe('text');
});

test('resource factory creates model', () => {
    const res = ResourceFactory.create('model');
    expect(res).toBeDefined();
    expect(res!.type).toBe('model');
});

test('resource factory unknown type returns undefined', () => {
    const res = ResourceFactory.create('unknown');
    expect(res).toBeUndefined();
});
