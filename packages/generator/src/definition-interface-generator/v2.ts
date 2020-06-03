import propertyMapper from '../property-mapper';
import {
  IOptions
} from '../types';
import {
  comment,
  nodeType,
  transformRef,
  tsArrayOf,
  tsIntersectionOf,
  tsUnionOf,
} from '../utils';
import {
  OpenAPI2, OpenAPI2Reference, OpenAPI2SchemaObject
} from 'jswagger-common';

export const PRIMITIVES: { [key: string]: 'boolean' | 'string' | 'number' } = {
  // boolean types
  boolean: 'boolean',

  // string types
  binary: 'string',
  byte: 'string',
  date: 'string',
  dateTime: 'string',
  password: 'string',
  string: 'string',

  // number types
  double: 'number',
  float: 'number',
  integer: 'number',
  number: 'number',
};

function snakeToCamel(str: string) {
  return str.replace(
    /([-_][a-z])/g,
    (group) => group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

interface TransformOptions {
  classMode?: boolean;
}

// type conversions
function transform(node: OpenAPI2SchemaObject, options?: TransformOptions): string {
  const _options = options || {};
  const resolvedType = nodeType(node);
  switch (resolvedType) {
  case 'ref': {
    return transformRef(node.$ref);
  }
  case 'string':
    if (_options.classMode) {
      switch (node.format) {
      case 'byte':
        return 'Buffer';
      case 'date-time':
        return 'Date';
      }
    }
  case 'number':
  case 'boolean': {
    return resolvedType;
  }
  case 'enum': {
    return tsUnionOf((node.enum as string[]).map((item) => `'${item}'`));
  }
  case 'object': {
    if (
      (!node.properties || !Object.keys(node.properties).length) &&
        !node.allOf &&
        !node.additionalProperties
    ) {
      return '{ [key: string]: any }';
    }

    let properties = createKeys(node.properties || {}, Array.isArray(node.required) ? node.required : [], options);

    // if additional properties, add to end of properties
    if (node.additionalProperties) {
      properties += `[key: string]: ${
        nodeType(node.additionalProperties) || 'any'
      };\n`;
    }

    return tsIntersectionOf([
      ...(node.allOf ? (node.allOf as any[]).map(v => transform(v, options)) : []), // append allOf first
      ...(properties ? [`{ ${properties} }`] : []), // then properties + additionalProperties
    ]);
    break;
  }
  case 'array': {
    return tsArrayOf(transform(node.items as any, options));
  }
  }

  return '';
}

export enum GenerateTypesOnlyFlag {
  INTERFACE = 1,
  CLASS = 2
}

export function generateTypesOnly(
  node: OpenAPI2SchemaObject | OpenAPI2Reference, flags: GenerateTypesOnlyFlag
) {
  if ('$ref' in node) {
    const ref = node.$ref;
    const definitionRegex = /#\/definitions\/(.*)/;
    const definitionMatcher = definitionRegex.exec(ref);
    if (!definitionMatcher) {
      return 'never';
    } else {
      const list: string[] = [];
      if (flags & GenerateTypesOnlyFlag.INTERFACE) {
        list.push(`definition.I${definitionMatcher[1]}`);
      }
      if (flags & GenerateTypesOnlyFlag.CLASS) {
        list.push(`definition.${definitionMatcher[1]}`);
      }
      return list.join(' | ');
    }
  } else {
    return transform(node, {
      classMode: !!(flags & GenerateTypesOnlyFlag.CLASS)
    });
  }
}

function createKeys(
  obj: { [key: string]: any },
  required: string[] = [],
  options: TransformOptions = {}
): string {
  let output = '';

  Object.entries(obj).forEach(([key, value]) => {
    // 1. JSDoc comment (goes above property)
    if (value.description) {
      output += comment(value.description);
    }

    // 2. name (with “?” if optional property)
    output += `"${key}"${!required || !required.includes(key) ? '?' : ''}: `;

    // 3. get value
    output += transform(value, options);

    // 4. close type
    output += ';\n';
  });

  return output;
}

function generateTypesV2(
  schema: OpenAPI2,
  propertyMapped: {[p: string]: OpenAPI2SchemaObject},
  options?: IOptions
): string {
  // note: make sure that base-level definitions are required
  return createKeys(propertyMapped, Object.keys(propertyMapped));
}

function generateTypeAliases(keys: string[]): string {
  return keys.map(key => {
    return `export type I${key} = definitions['${key}'];`;
  }).join('\n');
}

function extractChilds(input: string): string {
  const unpackAChar = (text: string, find: string[]) => {
    if (text.charAt(0) === find[0] && text.charAt(text.length - 1) === find[1])
      return text.substring(1, text.length - 1).trim();
    return text;
  };
  let output = input.trim();
  output = unpackAChar(output, ['(', ')']);
  output = unpackAChar(output, ['{', '}']);
  output = unpackAChar(output, ['(', ')']);
  return output;
}

function generateClass(
  schema: OpenAPI2,
  key: string,
  schemaObject: OpenAPI2SchemaObject,
  options?: IOptions
) {
  const className = key;
  const definitionMetadata = schemaObject.properties;
  const isWildcardType = key === 'WildcardType';
  const properties = schemaObject.properties && Object.keys(schemaObject.properties) || [];
  const toJsonObjectFunction = isWildcardType ?
    `return Object.keys(this)
        .reduce((result, key) => {
          result[key] = toJsonObject(metadata, ${className}[S_DEFINITION_METADATA], key, this[key]);
          return result;
        }, {});` :
    `return {
        ${properties.map(v => v + `: toJsonObject(metadata, ${className}[S_DEFINITION_METADATA], '${v}', this['${v}'])`).join(',')}
      };`;
  const isInstanceFunction = isWildcardType ?
    'return isSwaggerDefinition(this);' :
    `return o[S_DEFINITION_NAME] === ${className}.SWAGGER_DEFINITION_NAME;`;
  const assignFunction = isWildcardType ?
    `Object.entries(schema)
    .forEach(([key, value]) => {
      this[key] = value;
    });` :
    properties.map(v =>
      `this.${v} = toClassValue(metadata, ${className}[S_DEFINITION_METADATA], '${v}', schema.${v});`
    ).join(';\n');

  // options && options.propertyToCamel
  // schemaObject.properties

  return `export class ${key} extends BaseClass {
    ${extractChilds(
    transform(schemaObject, {
      classMode: true
    })
  )}
  
    public static SWAGGER_DEFINITION_NAME = '${className}';
    public readonly [S_DEFINITION_NAME]: string;
    
    public constructor(params?: {schema?: I${className}}) {
      super();
      this[S_DEFINITION_NAME] = '${className}';
      const schema = (params && params.schema) || ({} as any);
      ${assignFunction}
    }
    
    public _assignFrom(schema: I${className}) {
      ${assignFunction}
    }
    
    public static isInstance(o: any): boolean {
      ${isInstanceFunction}
    }
    
    public [S_METHOD_TO_JSON_OBJECT](): IJsonObject {
      ${toJsonObjectFunction}
    }
  }
  
  Object.defineProperty(${className}, S_DEFINITION_NAME, {
    get: () => '${className}'
  });
  
  Object.defineProperty(${className}, S_DEFINITION_METADATA, {
    get: () => (${JSON.stringify(definitionMetadata)})
  });
  `;
}

function generateClasses(
  schema: OpenAPI2,
  propertyMapped: {[p: string]: OpenAPI2SchemaObject},
  options?: IOptions
): string {
  return Object.entries(propertyMapped)
    .map(([key, value]) => {
      return generateClass(schema, key, value, options);
    }).join('\n');
}

function index(
  schema: OpenAPI2,
  options?: IOptions
) {
  if (!schema.definitions) {
    throw new Error(
      '⛔️ \'definitions\' missing from schema https://swagger.io/specification/v2/#definitions-object'
    );
  }

  // propertyMapper
  const propertyMapped = options
    ? propertyMapper(schema.definitions, options.propertyMapper)
    : schema.definitions;

  return `
  const S_DEFINITION_NAME = Symbol('Definition Name');
  const S_METHOD_TO_JSON_OBJECT = Symbol('toJsonObject');
  const S_DEFINITION_METADATA = Symbol('Definition Metadata');
  export type IJsonObject = any;
      
  export namespace definition {
  export abstract class BaseClass {
    public abstract [S_METHOD_TO_JSON_OBJECT](): IJsonObject;
  }
  export interface definitions {
    ${generateTypesV2(schema, propertyMapped, options)}
  }
  ${generateTypeAliases(Object.keys(propertyMapped))}
  ${generateClasses(schema, propertyMapped, options)}
  }
  
  export function isSwaggerDefinition(o: any): boolean {
    return (typeof o[S_DEFINITION_NAME] !== 'undefined');
  }
  
  export function getSwaggerDefinitionName(o: any): string {
    return o[S_DEFINITION_NAME];
  }
  
  export function swaggerDefinitionToJson(o: any): IJsonObject {
    return o[S_METHOD_TO_JSON_OBJECT]();
  }
  
  export const metadata = Object.freeze({
    isSwaggerDefinition, getSwaggerDefinitionName, swaggerDefinitionToJson, 
    classes: [
      ${Object.keys(propertyMapped).map(v => 'definition.' + v).join(', ')}
    ],
    definitions: {
      ${Object.entries(propertyMapped).map(([key, prop]) =>
    `'#/definitions/${key}': ${JSON.stringify(prop)}`
  ).join(',\n')}
    }
  });
  
  export interface definitions {
    ${Object.keys(propertyMapped).map(v => `${v}: definition.${v}`).join(';\n')}
  }
  `;
}

export default index;
