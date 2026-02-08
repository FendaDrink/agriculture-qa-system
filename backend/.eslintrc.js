module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended', // 关键：解决 ESLint & Prettier 冲突
    ],
    env: {
        node: true,
        jest: true,
    },
    rules: {
        /* ========== 代码风格 ========== */
        'semi': ['error', 'never'], // ❌ 不允许分号
        'prettier/prettier': [
            'error',
            {
                semi: false,
                singleQuote: true,
                trailingComma: 'all',
                endOfLine: 'auto',
            },
        ],

        /* ========== TypeScript 常用放宽 ========== */
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',

        /* ========== Nest 常用实践 ========== */
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_' },
        ],
    },
}
