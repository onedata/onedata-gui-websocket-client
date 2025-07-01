import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';
import { settled } from '@ember/test-helpers';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import GrisBatchContainerSpec from 'onedata-gui-websocket-client/utils/gris-batch-container-spec';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import { ConflictSpecContainerError } from 'onedata-gui-websocket-client/services/batch-request-registry';

describe('Unit | Service | batch-request-registry', function () {
  setupTest();

  it('getContainer returns null if container for GRI was never created', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri = Helper.generateGri();

    // when
    /** @type {OwsGraphRequestPayload} */
    const message = {
      gri: dummyGri,
      operation: OwsGraphOperation.Get,
    };
    const container = service.getContainer(message);

    // then
    expect(container).to.be.null;
  });

  it('getContainer returns BatchRequestContainer if container for GRI was created', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri = Helper.generateGri();
    const containerSpec =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri]);
    const containerCreated =
      service.createContainer(containerSpec);

    // when
    /** @type {OwsGraphRequestPayload} */
    const message = {
      gri: dummyGri,
      operation: OwsGraphOperation.Get,
    };
    const containerGot = service.getContainer(message);

    // then
    expect(containerGot).to.be.equal(containerCreated);
  });

  it('getContainer returns BatchRequestContainer for specific GRI it was created for', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const containerCreated1 = service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1])
    );
    const containerCreated2 = service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri2])
    );

    // when
    const message1 = {
      gri: dummyGri1,
      operation: OwsGraphOperation.Get,
    };
    const message2 = {
      gri: dummyGri2,
      operation: OwsGraphOperation.Get,
    };
    const containerGot1 = service.getContainer(message1);
    const containerGot2 = service.getContainer(message2);

    // then
    expect(containerGot1).to.be.equal(containerCreated1);
    expect(containerGot2).to.be.equal(containerCreated2);
  });

  it('getContainer returns null if some container for GRI was created but not for requested GRI', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const containerSpec1 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1]);
    service.createContainer(containerSpec1);

    // when
    const container = service.getContainer({
      gri: dummyGri2,
      operation: OwsGraphOperation.Get,
    });

    // then
    expect(container).to.be.null;
  });

  it('getContainer returns null if container for GRI was created but then destroyed', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri = Helper.generateGri();
    const containerSpec =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri]);
    const containerCreated =
      service.createContainer(containerSpec);
    service.destroyContainer(containerCreated);

    // when
    /** @type {OwsGraphRequestPayload} */
    const message = {
      gri: dummyGri,
      operation: OwsGraphOperation.Get,
    };
    const containerGot = service.getContainer(message);

    // then
    expect(containerGot).to.be.null;
  });

  it('getContainer returns the same BatchRequestContainer for different GRI if they belongs to the same container',
    function () {
      // given
      const service = this.owner.lookup('service:batch-request-registry');
      const dummyGri1 = Helper.generateGri();
      const dummyGri2 = Helper.generateGri();
      const containerCreated = service.createContainer(
        new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2])
      );

      // when
      const message1 = {
        gri: dummyGri1,
        operation: OwsGraphOperation.Get,
      };
      const message2 = {
        gri: dummyGri2,
        operation: OwsGraphOperation.Get,
      };
      const containerGot1 = service.getContainer(message1);
      const containerGot2 = service.getContainer(message2);

      // then
      expect(containerGot1).to.be.equal(containerCreated);
      expect(containerGot2).to.be.equal(containerCreated);
    }
  );

  it('createContainer throws an error if there is container with conflicting spec', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const container1 = service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2])
    );

    // when-then
    const newSpec =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri2, dummyGri3]);
    let expectedError;
    try {
      // This container would match dummyGri2, but it is already matched by other
      // container. Creating such container would create inconsistent behavior - user does
      // not know which one would be returned for dummyGri2 message.
      service.createContainer(newSpec);
    } catch (error) {
      expectedError = error;
    }
    expect(expectedError).to.be.ok;
    expect(expectedError.containerSpec).to.equal(newSpec);
    expect(expectedError.existingContainer).to.equal(container1);
  });

  it('createContainer does not throw an error if there is no container with conflicting spec', function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const dummyGri4 = Helper.generateGri();
    service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2])
    );

    // when-then
    expect(() => {
      // This container would match dummyGri2, but it is already matched by other
      // container. Creating such container would create inconsistent behavior - user does
      // not know which one would be returned for dummyGri2 message.
      service.createContainer(
        new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri3, dummyGri4])
      );
    }).to.not.throw(ConflictSpecContainerError);
  });

  it('waitForNoConflicts resolves when there is no conflicting container', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const dummyGri4 = Helper.generateGri();
    const containerSpec12 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2]);
    service.createContainer(containerSpec12);

    // when-then - it should just pass without timeout
    const containerSpec34 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri3, dummyGri4]);
    await service.waitForNoConflicts(containerSpec34);
  });

  it('waitForNoConflicts resolves after wait when there is a conflicting container', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const containerSpec12 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2]);
    const container12 = service.createContainer(containerSpec12);
    const containerSpec23 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri2, dummyGri3]);

    // when
    const waitPromise = service.waitForNoConflicts(containerSpec23);
    let waiterResolved = false;
    (async () => {
      await waitPromise;
      waiterResolved = true;
    })();

    // then 1: do not resolve waiter before destroy container
    await settled();
    expect(waiterResolved).to.be.false;

    // then 2: do not resolve waiter after flush before destroy container
    await container12.flush();
    expect(waiterResolved).to.be.false;

    // then 3: resolve waiter after destroy container
    service.destroyContainer(container12);
    await settled();
    expect(waiterResolved).to.be.true;
  });
});

class Helper {
  static generateGri() {
    return gri({
      entityType: 'space',
      entityId: uuid(),
      aspect: 'instance',
    });
  }
}
