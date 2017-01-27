/* @flow */
import path from 'path';

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';
import {fs} from 'mz';

import {Program} from '../../src/program';
import {
  applyConfigToArgv,
  loadJSConfigFile,
} from '../../src/config';
import {withTempDir} from '../../src/util/temp-dir';
import {UsageError} from '../../src/errors';

type MakeArgvParams = {|
  userCmd?: Array<string>,
  command?: string,
  commandDesc?: string,
  commandExecutor?: Function,
  commandOpt?: Object,
  globalOpt?: Object,
|}

function makeArgv({
  userCmd = [],
  command = 'fakecommand',
  commandDesc = 'this is a fake command',
  commandExecutor = sinon.stub(),
  commandOpt,
  globalOpt,
}: MakeArgvParams) {
  const program = new Program(userCmd);

  if (globalOpt) {
    program.setGlobalOptions(globalOpt);
  }
  if (commandOpt) {
    program.command(command, commandDesc, commandExecutor, commandOpt);
  }
  return {
    argv: program.yargs.exitProcess(false).argv,
    defaultValues: program.defaultValues,
  };
}

describe('config', () => {
  describe('applyConfigToArgv', () => {

    it('preserves a string value on the command line over configured', () => {
      const cmdLineSrcDir = '/user/specified/source/dir/';

      const {argv, defaultValues} = makeArgv({
        userCmd: ['fakecommand', '--source-dir', cmdLineSrcDir],
        globalOpt: {
          'source-dir': {
            requiresArg: true,
            type: 'string',
            demand: false,
          },
        },
      });
      const configObject = {
        sourceDir: '/configured/source/dir',
      };
      const newArgv = applyConfigToArgv({argv, configObject, defaultValues});
      assert.strictEqual(newArgv.sourceDir, cmdLineSrcDir);
    });

    it('preserves configured value over default', () => {
      const {argv, defaultValues} = makeArgv({
        userCmd: ['fakecommand'],
        globalOpt: {
          'source-dir': {
            requiresArg: true,
            type: 'string',
            demand: false,
            default: 'default/value/option/definition',
          },
        },
      });
      const configObject = {
        sourceDir: '/configured/source/dir',
      };
      const newArgv = applyConfigToArgv({argv, configObject, defaultValues});
      assert.strictEqual(newArgv.sourceDir, configObject.sourceDir);
    });

    it('preserves a string value on the command line over all others', () => {
      const cmdLineSrcDir = '/user/specified/source/dir/';
      const {argv, defaultValues} = makeArgv({
        userCmd: ['fakecommand', '--sourceDir', cmdLineSrcDir],
        globalOpt: {
          'source-dir': {
            requiresArg: true,
            type: 'string',
            demand: false,
            default: 'default/value/option/definition',
          },
        },
      });
      const configObject = {
        sourceDir: '/configured/source/dir',
      };
      const newArgv = applyConfigToArgv({argv, configObject, defaultValues});
      assert.strictEqual(newArgv.sourceDir, cmdLineSrcDir);
    });

    it('preserves default value of option if not in config', () => {
      const {argv, defaultValues} = makeArgv({
        userCmd: ['fakecommand'],
        globalOpt: {
          'source-dir': {
            requiresArg: true,
            type: 'string',
            demand: false,
            default: 'default/value/option/definition',
          },
        },
      });
      const configObject = {
        foo: '/configured/foo',
      };
      const newArgv = applyConfigToArgv({argv, configObject, defaultValues});
      assert.strictEqual(newArgv.sourceDir, 'default/value/option/definition');
    });

    it('preserves value on the command line if not in config', () => {
      const cmdLineSrcDir = '/user/specified/source/dir/';
      const {argv, defaultValues} = makeArgv({
        userCmd: ['fakecommand', '--sourceDir', cmdLineSrcDir],
        globalOpt: {
          'source-dir': {
            requiresArg: true,
            type: 'string',
            demand: false,
            default: 'default/value/option/definition',
          },
        },
      });
      const configObject = {
        foo: '/configured/foo',
      };
      const newArgv = applyConfigToArgv({argv, configObject, defaultValues});
      assert.strictEqual(newArgv.sourceDir, cmdLineSrcDir);
    });
  });

  describe('loadJSConfigFile', () => {
    it('throws an error if the config file does not exist', () => {
      return withTempDir (
        (tmpDir) => {
          assert.throws(() => {
            loadJSConfigFile((path.join(tmpDir.path(),
              'non-existant-config.js')));
          }, UsageError, /Cannot read config file/);
        });
    });

    it('throws an error if the config file has syntax errors', () => {
      return withTempDir (
        (tmpDir) => {
          const configFilePath = path.join(tmpDir.path(), 'config.js');
          fs.writeFileSync(configFilePath,
            // missing = in two places
            `module.exports {
                sourceDir 'path/to/fake/source/dir',
              };`);
          assert.throws(() => {
            loadJSConfigFile(configFilePath);
          }, UsageError);
        });
    });

    it('parses the configuration file correctly', () => {
      return withTempDir(
        (tmpDir) => {
          const configFilePath = path.join(tmpDir.path(), 'config.js');
          fs.writeFileSync(configFilePath,
            `module.exports = {
              sourceDir: 'path/to/fake/source/dir',
            };`);
          const configObj = loadJSConfigFile(configFilePath);
          assert.equal(configObj.sourceDir, 'path/to/fake/source/dir');
        });
    });

    it('does not throw an error for an empty config', () => {
      return withTempDir(
        (tmpDir) => {
          const configFilePath = path.join(tmpDir.path(), 'config.js');
          fs.writeFileSync(configFilePath, '{};');
          loadJSConfigFile(configFilePath);
        });
    });
  });
});
