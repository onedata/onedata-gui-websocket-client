import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';
import { settled } from '@ember/test-helpers';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import GrisBatchContainerSpec from 'onedata-gui-websocket-client/utils/gris-batch-container-spec';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import sleep from 'onedata-gui-websocket-client/utils/sleep';

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

  it('getContainer returns BatchRequestContainer if container for GRI was created', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri = Helper.generateGri();
    const containerSpec =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri]);
    const containerCreated =
      await service.createContainer(containerSpec);

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

  it('getContainer returns BatchRequestContainer for specific GRI it was created for', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const containerCreated1 = await service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1])
    );
    const containerCreated2 = await service.createContainer(
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

  it('getContainer returns null if some container for GRI was created but not for requested GRI',
async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const containerSpec1 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1]);
    await service.createContainer(containerSpec1);

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
    const containerCreated = await service.createContainer(containerSpec);
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
    async function () {
      // given
      const service = this.owner.lookup('service:batch-request-registry');
      const dummyGri1 = Helper.generateGri();
      const dummyGri2 = Helper.generateGri();
      const containerCreated = await service.createContainer(
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

  it('createContainer waits until other container with conflicting spec is destroyed', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const spec1 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2]);
    const container1 = await service.createContainer(spec1);

    // when-then
    const spec2 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri2, dummyGri3]);
    const containerCreatePromise = service.createContainer(spec2);
    let containerCreateFulfilled = false;
    containerCreatePromise.then(() => containerCreateFulfilled = true);
    await settled();
    expect(containerCreateFulfilled).to.be.false;
    service.destroyContainer(container1);
    await settled();
    expect(containerCreateFulfilled, 'create fulfilled').to.be.true;
  });

  it('createContainer is resolving container if there is no container with conflicting spec', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const dummyGri4 = Helper.generateGri();
    service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2])
    );

    // when
    // This container would match dummyGri2, but it is already matched by other
    // container. Creating such container would create inconsistent behavior - user does
    // not know which one would be returned for dummyGri2 message.
    const container = await service.createContainer(
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri3, dummyGri4])
    );

    // then
    expect(container).to.be.ok;
  });

  it('createContainer does not produce conflicts if used simultaneously', async function () {
    // given
    const service = this.owner.lookup('service:batch-request-registry');
    const dummyGri1 = Helper.generateGri();
    const dummyGri2 = Helper.generateGri();
    const dummyGri3 = Helper.generateGri();
    const spec1 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2]);
    const spec2 =
      new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri2, dummyGri3]);

    // when
    service.createContainer(spec1);
    service.createContainer(spec2);
    await sleep(0);

    // then
    expect(service.containers).to.have.lengthOf(1);
  });

  it('createContainer does not wait with creation of other container if it will not cause a conflict',
    async function () {
      // given
      const service = this.owner.lookup('service:batch-request-registry');
      const dummyGri1 = Helper.generateGri();
      const dummyGri2 = Helper.generateGri();
      const dummyGri3 = Helper.generateGri();
      const dummyGri4 = Helper.generateGri();
      const spec1 =
        new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri1, dummyGri2]);
      const spec2 =
        new GrisBatchContainerSpec(OwsGraphOperation.Get, [dummyGri3, dummyGri4]);

      // when
      service.createContainer(spec1);
      service.createContainer(spec2);
      await sleep(0);

      // then
      expect(service.containers).to.have.lengthOf(2);
    }
  );
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
