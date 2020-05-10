import {
  ISpecMetadata
} from './types';
import {
  OpenAPI2Reference,
  OpenAPI2SchemaObject
} from 'jswagger-common';

type PropertiesType = { [index: string]: OpenAPI2SchemaObject | OpenAPI2Reference };

export function toClassValue(metadata: ISpecMetadata, property: PropertiesType, key: string, value: any): any {
  const lastKey = key.split('/').reduce((prev, cur) => cur, '');
  const propInfo: OpenAPI2SchemaObject = ((tmp) => {
    return tmp.$ref ? metadata.definitions[tmp.$ref] : tmp;
  })(property[lastKey]);
  if (typeof value === 'object' && propInfo.type === 'object') {
    if (propInfo.properties) {
      const _properties = propInfo.properties;
      return Object.entries(propInfo.properties).reduce(
        (results, [curKey, curProp]) => {
          results[curKey] = toClassValue(metadata, _properties, key + '/' + curKey, value[curKey]);
          return results;
        }, {}
      );
    }
  }
  if (propInfo.type === 'string' && propInfo.format === 'date-time') {
    return new Date(value);
  } else if (propInfo.type === 'string' && propInfo.format === 'byte') {
    return Buffer.from(value, 'ascii');
  }
  return value;
}

export function toJsonObject(metadata: ISpecMetadata, property: PropertiesType, key: string, value: any): any {
  const lastKey = key.split('/').reduce((prev, cur) => cur, '');
  const propInfo = ((tmp) => {
    return tmp.$ref ? metadata.definitions[tmp.$ref] : tmp;
  })(property[lastKey]);
  if (typeof value === 'object' && propInfo.type === 'object') {
    return Object.entries(propInfo.properties).reduce(
      (results, [curKey, curProp]) => {
        results[curKey] = toJsonObject(metadata, propInfo.properties, key + '/' + curKey, value[curKey]);
        return results;
      }, {}
    );
  }
  if (propInfo.type === 'string' && propInfo.format === 'date-time' && value instanceof Date) {
    return value.toISOString();
  } else if (propInfo.type === 'string' && propInfo.format === 'byte' && Buffer.isBuffer(value)) {
    return value.toJSON();
  }
  return value;
}
