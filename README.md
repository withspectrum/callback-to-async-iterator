# `callback-to-async-iterator`

Turn any callback-based listener into an async iterator.

We needed this module to turn our database listeners into async iterators, which is what GraphQL subscriptions expect to be passed. It might be useful for you too!

```sh
npm install callback-to-async-iterator
```

## Usage

Imagine a standard callback-based listener like this:

```JS 
// callback will be called with each new message added to the database
const listenToNewMessages = (callback) => {
  return db.messages.listen(message => callback(message));
}
```

The problem is that callbacks are _push_ based, they push values to the listener whenever a new value is availabe. Async Iterators on the other hand are _pull_ based, they request a new value and wait until it is available.

This module reconciliates that difference so you can turn your standard callback-based listener into an async iterator:

```JS
import asyncify from 'callback-to-async-iterator';

const messages = asyncify(listenToNewMessages);

// Wait until the first message is sent
const firstMessage = await messages.next();

// Asynchronously iterate over new messages and log them as they come in
for await (let message of messages) {
  console.log(message);
}

console.log('Done!')
```

This module will automatically buffer incoming data if `.next` hasn't been called yet.

## Credits

This module is heavily based on the [event emitter to async iterator](https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts) utility used in `graphql-js`. Also big shoutout to [@ForbesLindesay](https://github.com/ForbesLindesay) who helped a ton with the initial implementation and understanding the problem.

## License

Licensed under the MIT License, Copyright ©️ 2017 Maximilian Stoiber. See [LICENSE.md](LICENSE.md) for more information.
