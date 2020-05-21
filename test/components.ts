import chai from 'chai';

const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

import SwaggerClient from '../packages/client/src/client';
import * as internals from '../packages/client/src/internals';

function rangeToArray(begin: number, last: number): number[] {
  const output: number[] = [];
  for (let i=begin; i<=last; i++) {
    output.push(i);
  }
  return output;
}

describe('Inter class-jsonobject converting Test', function () {
  it('date-time', function () {
    const propInfo = {
      type: 'string',
      format: 'date-time'
    };
    const orignalValue = new Date('2020-05-21T05:20:02.577Z');
    const jsonValue = internals.leafConvertToJsonValue(propInfo, orignalValue);
    const reconvValue = internals.leafConvertToClassValue(propInfo, jsonValue);
    expect(jsonValue).eq('2020-05-21T05:20:02.577Z');
    expect(reconvValue.getTime()).eq(orignalValue.getTime());
  });

  it('byte string', function () {
    const propInfo = {
      type: 'string',
      format: 'byte'
    };
    const arrayValue = rangeToArray(0, 0xff);
    const orignalValue = Buffer.from(arrayValue);
    expect(orignalValue.length).eq(256);
    const jsonValue = internals.leafConvertToJsonValue(propInfo, orignalValue);
    const reconvValue = internals.leafConvertToClassValue(propInfo, jsonValue);
    expect(reconvValue).eql(orignalValue);
  });
});

describe('SwaggerClient Test', function () {
  const urlConcatCases = [
    ['aaaa', 'bbbb'],
    ['aaaa/', 'bbbb'],
    ['aaaa', '/bbbb'],
    ['aaaa/', '/bbbb'],
    ['aaaa/bbbb', ''],
    ['', 'aaaa/bbbb']
  ];
  urlConcatCases.forEach((values, index) => {
    it('urlConcat case ' + (index + 1), async function () {
      expect(SwaggerClient.urlConcat(values[0], values[1])).eq('aaaa/bbbb');
    });
  });
});
