import js from '@eslint/js';
import react from 'eslint-plugin-react';
export default [
  {ignores:['.next/**','node_modules/**']},
  js.configs.recommended,
  {
    files:['app/**/*.{js,jsx}','src/**/*.js','tests/**/*.js'],
    languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:{window:'readonly',document:'readonly',history:'readonly',location:'readonly',navigator:'readonly',crypto:'readonly',URL:'readonly',TextEncoder:'readonly',FormData:'readonly',console:'readonly',process:'readonly',setTimeout:'readonly',clearTimeout:'readonly',React:'readonly'}},
    plugins:{react},
    rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_'}],'no-undef':'error','react/jsx-uses-react':'error','react/jsx-uses-vars':'error'},
  },
  {files:['app/**/*.{js,jsx}'],rules:{'no-empty':'off'}},
];
