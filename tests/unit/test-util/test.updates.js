/* @flow */
import {it, describe} from 'mocha';
import {assert} from 'chai';
import sinon from 'sinon';

import {checkForUpdates} from '../../../src/util/updates';

describe('util/updates', () => {
  describe('checkForUpdates()', () => {
    it('calls the notifier with the correct parameters', () => {
      let updateNotifierStub = sinon.spy(() => {
        return {
          notify: sinon.spy(),
        };
      });

      checkForUpdates({
        name: 'web-ext',
        version: '1.0.0',
        updateCheckInterval: 0,
        updateNotifier: updateNotifierStub,
      });
      assert.equal(updateNotifierStub.called, true);
      assert.equal(updateNotifierStub.firstCall.args[0].pkg.name, 'web-ext');
      assert.equal(updateNotifierStub.firstCall.args[0].pkg.version, '1.0.0');
      assert.equal(updateNotifierStub.firstCall.args[0].updateCheckInterval,
                    1000 * 60 * 60 * 24 * 7);
    });
  });
});