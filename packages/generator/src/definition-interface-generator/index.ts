import {
  swaggerVersion
} from '../utils';
import {
  IOptions
} from '../types';
import v2 from './v2';
import v3 from './v3';
import {
  OpenAPI2, OpenAPI3
} from 'jswagger-common';

export function makeDefinitions(
  schema: OpenAPI2 | OpenAPI3,
  options?: IOptions
): string {
  // generate types for V2 and V3
  const version = swaggerVersion(schema);
  let output = '';

  if (version != 2) {
    throw Error('Not supported version: ' + version);
  }

  switch (version) {
  case 2: {
    output = output.concat(v2(schema as OpenAPI2, options));
    break;
  }
    // case 3: {
    //   output = output.concat(v3(schema as OpenAPI3, options));
    //   break;
    // }
  }

  return output;
}
