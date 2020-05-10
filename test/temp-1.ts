import * as path from 'path';
import * as fs from 'fs';

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

import {
  OpenAPI2
} from '../packages/common/src/types';
import generator from '../packages/generator/src';
import jsclient from '../packages/client/src';

import * as TestInterface1 from '../test-resource/test-api-1';

describe('OpenAPI2 Test', function () {
  const spec: OpenAPI2 = require(
    path.resolve(path.join(__dirname, '../test-resource/test-api-1-spec.json'))
  );

  it('OpenAPI2 Generate and test', async function () {
    const output = generator(spec);
    fs.writeFileSync(
      path.resolve(path.join(__dirname, '../test-resource/test-api-1.ts')),
      output.replace(
        'from \'jswagger-client\'', 'from \'../packages/client/src/\''
      )
    );

    const client = jsclient({
      spec: spec
    });

    const testApi: TestInterface1.TestApi = client.api<TestInterface1.TestApi>(
      TestInterface1.APIS.TestApi
    );

    await testApi.getManyTypes({
      data: {
        number32: 1234,
        number64: 12345,
        simpleText: 'hello',
        binaryText: 'world',
        timestamp: new Date().toISOString()
      }
    })
      .then(response => {
        console.log('response => ', response.data);
      })
      .catch(err => {
        console.error('err => ', err);
      });
  });
});
