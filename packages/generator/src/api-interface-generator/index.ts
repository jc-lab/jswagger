import {
  findApisByTag,
  OpenAPI2,
  OpenAPI2Path,
  OpenAPI2Reference,
  OpenAPI2SchemaObject,
  OpenAPI2Tag,
  OpenAPI3
} from 'jswagger-common';
import {
  IOptions
} from '../types';
import {
  generateTypesOnly, GenerateTypesOnlyFlag
} from '../definition-interface-generator/v2';

const templateIn = `
/*INTERFACES_S*/
export interface _GenITagName {
  /*METHODS_S*/
  /**
   * _GenMethodName
   * 
   * @throws {ApiError}
   * @return {Promise<ApiResponse<?>>}
   */
  _GenMethodName(options_GenApiOptionOptional: ApiRequestOptions_GenApiRequestOptionsSuffix<_GenRequestBodyType, _GenParamsType>): Promise<ApiResponse<_GenResponseBodyType, _GenResponseHeaderType>>;
  /*METHODS_E*/
}
/*INTERFACES_E*/
`;

function makeInterfaceTypeFromSchema(node: OpenAPI2SchemaObject | OpenAPI2Reference, flags?: GenerateTypesOnlyFlag): string {
  return generateTypesOnly(
    node,
    (typeof flags === 'undefined') ? GenerateTypesOnlyFlag.INTERFACE | GenerateTypesOnlyFlag.CLASS : flags
  );
}

function makeInterfaceName(tagName: string): string {
  return tagName.replace(
    /([-_].)/g,
    (group) => group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

export function makeApiInterfaces(
  spec: OpenAPI2 | OpenAPI3,
  options?: IOptions
): string {
  const outputs: string[] = [];
  const interfacesMatcher = /(\/\*INTERFACES_S\*\/)((?:.|\r|\n)*)(\/\*INTERFACES_E\*\/)/gm.exec(templateIn);
  if (!interfacesMatcher) {
    throw new Error('Unknown Error #1');
  }

  outputs.push(templateIn.slice(0, interfacesMatcher.index));

  const interfaceTemplate = interfacesMatcher[2];
  const methodsMatcher = /(\/\*METHODS_S\*\/)((?:.|\r|\n)*)(\/\*METHODS_E\*\/)/gm.exec(interfaceTemplate);
  if (!methodsMatcher) {
    throw new Error('Unknown Error #2');
  }

  const methodTemplate = methodsMatcher[2];

  const tags = spec.tags && spec.tags.length > 0 ? spec.tags : (() => {
    const tagNames = new Set<string>();
    Object.entries(spec.paths)
      .forEach((a) => {
        const pathItem = a[1] as OpenAPI2Path;
        Object.entries(pathItem)
          .forEach(([, methodItem]) => {
            methodItem.tags.forEach(tagName => {
              tagNames.add(tagName);
            });
          });
      });
    return Array.from(tagNames.keys())
      .reduce((result, current) => {
        result.push({
          name: current,
          description: ''
        });
        return result;
      }, [] as OpenAPI2Tag[]);
  })();

  tags.forEach((tagItem: OpenAPI2Tag) => {
    const tagOutputs: string[] = [];
    tagOutputs.push(interfaceTemplate.slice(0, methodsMatcher.index));
    const apis = findApisByTag(spec, tagItem.name);

    apis.forEach(apiItem => {
      const reqBodyParameter = apiItem.api.parameters && apiItem.api.parameters.find(v => v.in === 'body');
      const reqAllParameters = apiItem.api.parameters && apiItem.api.parameters.filter(v => v.in !== 'body') || [];

      const reqBodyOptionalType =
        reqBodyParameter ? (reqBodyParameter.required ? 'R' : 'O') :
          'X';
      const reqParametersOptionalType =
        (reqAllParameters.length === 0) ? 'X' :
          reqAllParameters.find(v => v.required) ? 'R' : 'O';

      const reqBodyType = (reqBodyParameter && reqBodyParameter.schema) ?
        makeInterfaceTypeFromSchema(reqBodyParameter.schema) :
        'never';

      const reqParamsType =
        (() => {
          const types: string[] = [];
          reqAllParameters
            .map(v => {
              if (options && options.paramFilter) {
                return options.paramFilter({
                  tag: tagItem.name,
                  path: apiItem.path,
                  method: apiItem.method
                }, v);
              }
              return v;
            })
            .forEach((item) => {
              if (item) {
                types.push(`'${item.name}': ` + (item.schema ? makeInterfaceTypeFromSchema(item.schema) : 'any'));
              }
            });
          return `{${types.join(', ')}}`;
        })();
      const resParameters = apiItem.api.responses && apiItem.api.responses['200'];
      const responseBodyType = (resParameters && resParameters.schema) ?
        makeInterfaceTypeFromSchema(resParameters.schema, GenerateTypesOnlyFlag.CLASS) :
        'never';
      const responseHeaderType =
        (() => {
          const types: string[] = [];
          if (resParameters && resParameters.headers) {
            Object.entries(resParameters.headers)
              .forEach(([name, item]) => {
                types.push(`'${name}': ` + makeInterfaceTypeFromSchema(item));
              });
          }
          types.push('[key: string]: any');
          return `{${types.join(', ')}}`;
        })();

      tagOutputs.push(
        methodTemplate
          .replace(/_GenMethodName/g, apiItem.api.operationId)
          .replace('_GenApiRequestOptionsSuffix', reqBodyOptionalType + reqParametersOptionalType)
          .replace('_GenApiOptionOptional',
            (
              ((reqBodyOptionalType === 'X') || (reqBodyOptionalType === 'O')) &&
              ((reqParametersOptionalType === 'X') || (reqParametersOptionalType === 'O'))
            ) ? '?' : ''
          )
          .replace('_GenRequestBodyType', reqBodyType)
          .replace('_GenResponseBodyType', responseBodyType)
          .replace('_GenParamsType', reqParamsType)
          .replace('_GenResponseHeaderType', responseHeaderType)
      );
    });

    tagOutputs.push(interfaceTemplate.slice(methodsMatcher.index + methodsMatcher[0].length));
    outputs.push(
      tagOutputs.join('')
        .replace('_GenITagName', makeInterfaceName(tagItem.name))
    );
  });

  outputs.push(templateIn.slice(interfacesMatcher.index + interfacesMatcher[0].length));

  outputs.push('export const APIS = Object.freeze({\n');
  outputs.push(
    tags.map((tagItem: OpenAPI2Tag) => {
      return `${makeInterfaceName(tagItem.name)}: {
        tag: '${tagItem.name}',
        specMetadata: metadata
      }`;
    })
  );
  outputs.push('});');

  return outputs.join('');
}
