// TypeScript definitions for CSS modules.
//
// css-loader is configured with named exports (its v7 default), so import
// styles with `import * as css from './X.module.css'`. The `export =` shape
// plus esModuleInterop makes that namespace import indexable.
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export = classes;
}

declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export = classes;
}

declare module "*.module.sass" {
  const classes: { [key: string]: string };
  export = classes;
}
