import { ElementCommand } from '../../command/element-command';

test('parse simple command', () => {
    const cmd = ElementCommand.parse('pushFill(Blue)');
    expect(cmd.name).toBe('pushFill');
    expect(cmd.parameter).toBe('Blue');
});

test('parse command without parameter', () => {
    const cmd = ElementCommand.parse('popFill');
    expect(cmd.name).toBe('popFill');
    expect(cmd.parameter).toBe('');
});

test('parse command with complex parameter', () => {
    const cmd = ElementCommand.parse('navigate(https://example.com)');
    expect(cmd.name).toBe('navigate');
    expect(cmd.parameter).toBe('https://example.com');
});

test('parse command with empty parameter', () => {
    const cmd = ElementCommand.parse('myCommand()');
    expect(cmd.name).toBe('myCommand');
    expect(cmd.parameter).toBe('');
});
