export class ElementCommand {
    /**
     * Parses string into element command
     * @param commandString - Command string
     * @returns Parsed element command
     */
    public static parse(commandString: string): ElementCommand {
        if (commandString.indexOf('(') !== -1) {
            const commandName = commandString.substring(0, commandString.indexOf('('));
            const commandParameter = commandString.substring(commandString.indexOf('(') + 1, commandString.length - 1);
            return new ElementCommand(commandName, commandParameter);
        }
        return new ElementCommand(commandString, '');
    }

    /**
     * Command name
     */
    public name: string;

    /**
     * Command parameter
     */
    public parameter: string;

    /**
     * Describes an element command and optional parameter
     * @param name - Command name
     * @param parameter - Command parameter
     */
    constructor(name: string, parameter: string) {
        this.name = name;
        this.parameter = parameter;
    }
}
