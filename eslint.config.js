import js from '@eslint/js';
export default [js.configs.recommended,{files:['src/**/*.js','tests/**/*.js'],languageOptions:{ecmaVersion:2022,sourceType:'module',globals:{window:'readonly',document:'readonly',history:'readonly',location:'readonly',crypto:'readonly',URL:'readonly',TextEncoder:'readonly'}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_'}],'no-undef':'error'}}];
