// Config plana de ESLint 9.
//
// `eslint-config-next` 16 ya exporta config plana, asi que se extiende
// directamente. Pasarla por `FlatCompat` —que es como estaba— rompia el
// arranque con "Converting circular structure to JSON": el compat de
// eslintrc intenta serializar la config para validarla y los plugins de
// Next se referencian entre si.
import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    // `ecosystem.config.js` es la config de PM2: CommonJS a proposito, y
    // no es codigo de la aplicacion.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "ecosystem.config.js"],
  },
  ...next,
  ...nextTs,
];

export default eslintConfig;
