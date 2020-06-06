![Node.js CI](https://github.com/Livshitz/di.libx.js/workflows/Node.js%20CI/badge.svg)

# 💉 di.libx.js
> Lightweight Dependency Injection module that supports async/deferred resolution and uglified support.

### Features:
- **Deferred resolution** - asynchronously require dependencies that are not yet available and resolve once it is.
- **Automatic resolve of function params** - Resolve & map dependencies manually or as function's parameters
- **NodeJS & browser** - browserified version ready to use from CDN.
- **Explicit or implicit dependencies** - Works with uglified files by specifiend dependencies' names or implicitly from function/class name.


## Use:
#### NodeJS:
```
yarn add di.libx.js
```

#### Browser:
```
https://cdn.jsdelivr.net/npm/di.libx.js@latest/dist/browser.min.js
(Modules are loaded into `window.libx.concurrency` object).
```
Use this library in browser from CDN, [code example](examples/index.html), [live example](https://raw.githack.com/Livshitz/di.libx.js/master/examples/index.html).  
Or include from node_modules.

------

Basic usage:
```javascript:
const myFunc = ()=>{
    console.log('This is myFunc');
}

// Register a dependencies
libx.di.register(myFunc, 'func');

// Require dependencies. Will wait until all dependencies are ready
// Note that awaiting this function will create dead lock unless the other register will called in parallel
libx.di.require((func, anonFunc)=>{
    func();
    anonFunc();
});

// Register another dependencies. Will trigger execution of the `require`
libx.di.register(()=>console.log('Anonymous func'), 'anonFunc');
```

Check more examples in unit-test at [tests](tests/DependencyInjector.test.ts).

------

## Develop:

### Build:
> ``` $ yarn build ```

### Watch & Build:
> ``` $ yarn watch ```

### Run tests:
> ``` $ yarn test ```

