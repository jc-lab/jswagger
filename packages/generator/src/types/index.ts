import {
  OpenAPI2ApiParameter,
  OpenAPI2SchemaObject,
  OpenAPI3SchemaObject
} from 'jswagger-common';
import * as prettier from 'prettier';

export interface Property {
  interfaceType: string;
  optional: boolean;
  description?: string;
}

export interface IOptions {
  /**
   * (optional) Prettier config
   **/
  prettierConfig?: prettier.Options;

  /**
   * (optional) Function to iterate over every schema object before transforming to TypeScript
   **/
  propertyMapper?: (
    schemaObject: OpenAPI2SchemaObject | OpenAPI3SchemaObject,
    property: Property
  ) => Property;

  /**
   * api parameter editor
   */
  paramFilter?: (
    apiInfo: {
      tag: string,
      method: string,
      path: string
    }, param: OpenAPI2ApiParameter
  ) => OpenAPI2ApiParameter | null;

  /**
   * TODO: (optional) property name replace to camelCase in definition class
   *
   * @default false
   *
   * $ref까지 고려해야 함
   **/
  // propertyToCamel?: boolean;
}
