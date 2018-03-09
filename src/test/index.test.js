// @flow
import { isAsyncIterable } from 'iterall';
import asyncify from '../';

it('should turn a callback listener into an async iterator', async () => {
  const listener = (cb: () => void) => new Promise(res => { cb(); res(); });
  const iter = asyncify(listener);
  expect(isAsyncIterable(iter)).toEqual(true);
  await iter.return()
});

it('should get new values while waiting for .next', async () => {
  const listener = (cb: (arg: number) => void) => new Promise(res => {
    res();
    setTimeout(() => cb(1), 100);
    setTimeout(() => cb(2), 200);
  });

  const iter = asyncify(listener);
  const first = await iter.next();
  expect(first.value).toEqual(1);
  expect(first.done).toEqual(false);
  const second = await iter.next();
  expect(second.value).toEqual(2);
  expect(second.done).toEqual(false);
  await iter.return()
})

it('should buffer values that are added before .next is called', async () => {
  const listener = (cb: (arg: number) => void) => new Promise(res => {
    res();
    cb(1);
    cb(2);
  });

  const iter = asyncify(listener);
  // Delay to make sure the callback calls are done
  // before .next is called
  await new Promise(res => setTimeout(res, 50));
  const first = await iter.next();
  expect(first.value).toEqual(1);
  expect(first.done).toEqual(false);
  const second = await iter.next();
  expect(second.value).toEqual(2);
  expect(second.done).toEqual(false);
  await iter.return()
});

it('should return done: true on return', async () => {
  const listener = (cb: () => void) => Promise.resolve();
  
  const iter = asyncify(listener);
  expect((await iter.return()).done).toEqual(true)
})

it('should resolve with done: true if .next is called after .return', async () => {
  const listener = (cb: () => void) => Promise.resolve()

  const iter = asyncify(listener);
  await iter.return();
  expect((await iter.next()).done).toEqual(true)
})

describe('options', () => {
  it('should call onError with an error thrown in the listener', async () => {
    const error = new Error('Bla')
    const listener = (cb: () => void) => Promise.reject(error);

    expect.hasAssertions();
    const iter = asyncify(listener, {
      onError: (err) => {
        expect(err).toEqual(error);
      }
    });
  })

  it('should call onError with an error thrown by the async iter', async () => {
    const error = new Error('Bla bla');
    const listener = (cb: () => void) => Promise.resolve();

    expect.assertions(2);
    const iter = asyncify(listener, {
      onError: (err) => {
        expect(err).toEqual(error);
      }
    });
    await iter.throw(error).catch(err => {
      expect(err).toEqual(error);
    });
  })

  it('should call onClose with the return value from the listener', async () => {
    const returnValue = 'asdf';
    const listener = (cb: () => void) => new Promise(res => {
      res(returnValue);
    })

    expect.hasAssertions();
    const iter = asyncify(listener, {
      onClose: (val) => {
        expect(val).toEqual(returnValue);
      }
    });
    // Wait a tick so that the promise resolves with the return value
    await new Promise(res => setTimeout(res, 10));
    await iter.return();
  })
})
