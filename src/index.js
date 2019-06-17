// @flow
// Turn a callback-based listener into an async iterator
// Based on https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
import { $$asyncIterator } from 'iterall';

const defaultOnError = (err: Error) => {
  throw new Error(err);
};

function callbackToAsyncIterator<CallbackInput: any, ReturnVal: any>(
  listener: ((arg: CallbackInput) => any) => Promise<?ReturnVal>,
  options?: {
    onError?: (err: Error) => void,
    onClose?: (arg?: ?ReturnVal) => Promise<void> | void,
    buffering?: boolean,
  } = {}
) {
  const { onError = defaultOnError, buffering = true, onClose } = options;
  try {
    let pullQueue = [];
    let pushQueue = [];
    let listening = true;
    let listenerReturnValue;
    // Start listener
    listener(value => pushValue(value))
      .then(a => {
        listenerReturnValue = a;
      })
      .catch(err => {
        onError(err);
      });

    function pushValue(value) {
      if (pullQueue.length !== 0) {
        pullQueue.shift()({ value, done: false });
      } else if (buffering === true) {
        pushQueue.push(value);
      }
    }

    function pullValue() {
      return new Promise(resolve => {
        if (pushQueue.length !== 0) {
          resolve({ value: pushQueue.shift(), done: false });
        } else {
          pullQueue.push(resolve);
        }
      });
    }

    function emptyQueue() {
      if (listening) {
        listening = false;
        pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
        pullQueue = [];
        pushQueue = [];
        if (onClose) {
          try {
            const closeRet = onClose(listenerReturnValue);
            if (closeRet) closeRet.catch(e => onError(e));
          } catch (e) {
            onError(e);
          }
        }
      }
    }

    return {
      next(): Promise<{ value?: CallbackInput, done: boolean }> {
        return listening ? pullValue() : this.return();
      },
      return(): Promise<{ value: typeof undefined, done: boolean }> {
        emptyQueue();
        return Promise.resolve({ value: undefined, done: true });
      },
      throw(error: Error) {
        emptyQueue();
        onError(error);
        return Promise.reject(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };
  } catch (err) {
    onError(err);
    return {
      next() {
        return Promise.reject(err);
      },
      return() {
        return Promise.reject(err);
      },
      throw(error: Error) {
        return Promise.reject(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };
  }
}

export default callbackToAsyncIterator;
