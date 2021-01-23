![Node.js CI](https://github.com/Livshitz/di.libx.js/workflows/Node.js%20CI/badge.svg)

# 💉 di.libx.js
> Lightweight Dependency Injection module that supports async/deferred resolution and uglified support for Typescript and JavaScript in 3.3kB gzipped (14.7kB on disk). Feature complete, fast, reliable and well tested.

### Features:
- **Deferred resolution** - asynchronously require dependencies that are not yet available and resolve once it is.
- **Automatic resolve of function params** - resolve & map dependencies manually or as function's parameters
- **NodeJS & browser** - browserified version ready to use from CDN.
- **Explicit or implicit dependencies** - works with uglified files by specified dependencies' names or implicitly from function/class name.
- **Typescript support** - specify injected instance's types.
- **Non Intrusive** - register any modules; your internal modules or 3rd-party modules without modifing its code. No attribute wrapping needed.


## Use:
Install via yarn (recommended):
```
yarn add di.libx.js
```
Install via npm:
```
npm install --save di.libx.js
```

#### Browser:
```
https://cdn.jsdelivr.net/npm/di.libx.js@latest/dist/browser.min.js
(Modules are loaded into `window.libx.di` object).
```
Use this library in browser from CDN, [code example](examples/index.html), [live example](https://raw.githack.com/Livshitz/di.libx.js/master/examples/index.html).  
Or include from node_modules.

------

Basic usage:
```javascript
import DependencyInjector from 'di.libx.js';
// const DependencyInjector = require('di.libx.js');

const di = new DependencyInjector();

const myFunc = ()=>{
    console.log('This is myFunc');
}

// Register a dependencies
di.register(myFunc, 'func');

// Require dependencies. Will wait until all dependencies are ready
// Note that awaiting this function will create dead lock unless the other register will called in parallel
di.require((func, anonFunc)=>{
    func();
    anonFunc();
});

// Register another dependencies. Will trigger execution of the `require`
di.register(()=>console.log('Anonymous func'), 'anonFunc');
```

More examples:
```javascript
// in your web app add:
// <script src="https://cdn.jsdelivr.net/npm/di.libx.js@latest/dist/browser.min.js"></script>

var myModule = { somveVar: 1 };
libx.di.register(myModule, 'myModule');

// async require:
await libx.di.require((myModule)=>{
    console.log('dependency resolved!', myModule);
    // execute your code here. 'await' is optional incase you want it to be async and continue execution.
    // note: the callback will be triggered only once the dependency is registered somewhere else in your program. Beware not to create dead-lock.
});

// sync get
mod = libx.di.get('myModule');

// register new module with other dependencies:
mod = libx.di.registerResolve('myNewModule', (myModule)=> {
    return ()=>console.log('this came from myNewModule!', myModule);
});

// require for uglified code:
libx.di.requireUgly(['myModule'], myModule=> {
    console.log('unglified dependency resolved!', myModule);
});
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

