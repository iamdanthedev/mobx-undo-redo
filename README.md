
# MobX store undo-redo #

Keeps track of changes in your MobX store

Easy to use: just extend your store class with `Loggable`:

```typescript
class MyStore extends Loggable {
  // ... store observables and actions
}

const myStore = new MyStore();

// API:
myStore.canUndo; // boolean
myStore.canRedo; // boolean
myStore.undo();
myStore.redo();

```


