import * as path from 'path';
import * as fs from 'fs';
import chai from 'chai';
import BigNumber from 'bignumber.js';
import {
  CLIEngine
} from 'eslint';

const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

import {
  OpenAPI2
} from '../packages/common/src/types';
import generator from '../packages/generator/src';
import jsclient, {
  SwaggerClient,
  ISwaggerClientConfig
} from '../packages/client/src';

import * as TestInterface1 from '../test-resource/test-api-1';

let generated = false;

function createTestClient(spec: OpenAPI2, appendOptions?: Partial<ISwaggerClientConfig>): SwaggerClient {
  if (!generated) {
    generated = true;

    const eslint = new CLIEngine({
      fix: true,
      configFile: path.resolve(__dirname, '../.eslintrc.js')
    });
    let output = generator(spec);
    const lintReport = eslint.executeOnText(output);
    if (!lintReport.results[0].output) {
      throw Error('lintReport.results[0].output is undefined');
    }
    fs.writeFileSync(
      path.resolve(path.join(__dirname, '../test-resource/test-api-1.ts')),
      lintReport.results[0].output.replace(
        'from \'jswagger-client\'', 'from \'../packages/client/src/\''
      )
    );
  }

  return jsclient({
    spec: spec,
    ...appendOptions
  });
}

describe('OpenAPI2 Test', function () {
  this.timeout(5000);

  const spec: OpenAPI2 = require(
    path.resolve(path.join(__dirname, '../test-resource/test-api-1-spec.json'))
  );

  it('OpenAPI2 Generate and test', async function () {
    const client = createTestClient(spec);
    should.exist(client);
  });

  it('API interface test', async function () {
    const client = createTestClient(spec);

    const deviceApi: TestInterface1.Device = client.api<TestInterface1.Device>(
      TestInterface1.APIS.Device
    );
    should.exist(deviceApi);

    const testApi: TestInterface1.TestApi = client.api<TestInterface1.TestApi>(
      TestInterface1.APIS.TestApi
    );
    should.exist(testApi);
  });

  it('No parameter api call test', async function () {
    const client = createTestClient(spec);
    const deviceApi: TestInterface1.Device = client.api<TestInterface1.Device>(
      TestInterface1.APIS.Device
    );
    const result = await deviceApi.getDevices();

    expect(result.status).eq(200);

    expect(result.data).to.have.all.members([ 'http://10.0.0.225:8080' ]);
  });

  it('ManyTypes test', async function () {
    const client = createTestClient(spec);
    const testApi: TestInterface1.TestApi = client.api<TestInterface1.TestApi>(
      TestInterface1.APIS.TestApi
    );

    const result = await testApi.getManyTypes({
      data: {
        number32: 1234,
        number64: 12345,
        simpleText: 'hello',
        binaryText: 'world',
        timestamp: new Date().toISOString()
      }
    });

    expect(result.status).eq(200);

    expect(result.data.code).eq(0);
    expect(typeof result.data.message).eq('string');
    expect(typeof result.data.result).eq('object');
    if (!result.data.result) {
      return ;
    }

    expect(result.data.result.number32).eq(123456789);
    expect(BigNumber.isBigNumber(result.data.result.number64)).eq(true);
    expect(new BigNumber('1311768465173141112').eq(result.data.result.number64 as any)).eq(true);
    expect(result.data.result.simpleText).eq('hello world');
    expect(result.data.result.binaryText).eql(Buffer.from([0x00, 0x01, 0x02, 0xff]));
    expect((result.data.result.timestamp as any) instanceof Date).eq(true);
  });

  it('retry test', async function () {
    let testCount = 0;

    const client = createTestClient(spec, {
      retryHandler: (params, retryCount, err) => {
        testCount++;
        expect(testCount).eq(1);
        return Promise.resolve(100);
      },
      hostRewriter: params => {
        if (testCount === 0) {
          return {
            host: 'nothing.nothing'
          };
        } else {
          return undefined;
        }
      }
    });
    const testApi: TestInterface1.TestApi = client.api<TestInterface1.TestApi>(
      TestInterface1.APIS.TestApi
    );

    const result = await testApi.getManyTypes({
      data: {
        number32: 1234,
        number64: 12345,
        simpleText: 'hello',
        binaryText: 'world',
        timestamp: new Date().toISOString()
      }
    });

    expect(testCount).eq(1);

    expect(result.status).eq(200);

    expect(result.data.code).eq(0);
    expect(typeof result.data.message).eq('string');
    expect(typeof result.data.result).eq('object');
    if (!result.data.result) {
      return ;
    }

    expect(result.data.result.number32).eq(123456789);
    expect(BigNumber.isBigNumber(result.data.result.number64)).eq(true);
    expect(new BigNumber('1311768465173141112').eq(result.data.result.number64 as any)).eq(true);
    expect(result.data.result.simpleText).eq('hello world');
    expect(result.data.result.binaryText).eql(Buffer.from([0x00, 0x01, 0x02, 0xff]));
    expect((result.data.result.timestamp as any) instanceof Date).eq(true);
  });
});
