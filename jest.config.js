module.exports = {
    roots: [ '<rootDir>/src' ],
    testMatch: [ '**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)' ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/__tests__/**'
    ],
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest'
    }
};
