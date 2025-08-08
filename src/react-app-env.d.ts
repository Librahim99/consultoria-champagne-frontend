/// <reference types="react-scripts" />
declare module 'react-tooltip' {
  import { FC } from 'react';
  const ReactTooltip: FC<any>;
  export default ReactTooltip;
}

declare module 'stream-consumers' {
  const value: any;
  export = value;
}