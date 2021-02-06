import { DependencyInjector } from '../src/DependencyInjector';
import { sleep, Deferred } from 'concurrency.libx.js';

class MyClass {
    public classFunc() {
        return 10;
    }
}

class AutowireClass {
    constructor(private myClass: MyClass) {
        // expect myFunc to be injected
    }
    public testMe() {
        return this.myClass.classFunc(); // use injected method
    }
}

let di: DependencyInjector;

function myFunc(arg: number) {
    return arg * 10;
}

const myFuncAnonymous = () => 2;

beforeEach(async (done) => {
    di = new DependencyInjector();
    done();
});

describe('dependencyInjector main tests', () => {
    test('Single register and require', async (done) => {
        const moduleName = 'test';
        di.register(moduleName, <any>myFunc);

        let [dep] = <[typeof myFunc]>await di.require([moduleName]);
        expect(typeof dep).toBe(typeof myFunc);

        let res = dep(2);
        expect(res).toBe(20);

        done();
    });

    test('Single register and require - object module', async (done) => {
        const moduleName = 'test';
        const myObj = {
            a: 1,
            b: 2,
        };
        di.register(moduleName, myObj);

        let [dep] = <[typeof myObj]>await di.require([moduleName]);

        expect(dep.a).toBe(1);

        done();
    });

    test('Single register and require using a Symbol', async (done) => {
        const symb = Symbol('test');
        di.register(symb, <any>myFunc);

        let [dep] = <[typeof myFunc]>await di.require([symb]);
        expect(typeof dep).toBe(typeof myFunc);

        let res = dep(2);
        expect(res).toBe(20);

        done();
    });

    test('Async single register and require', async (done) => {
        const moduleName = 'test';

        di.require([moduleName]).then((deps: any[]) => {
            const dep = deps[0];
            expect(typeof dep).toBe(typeof myFunc);

            let res = dep(2);
            expect(res).toBe(20);

            expect(di.hasPendingRequireRequests()).toBe(false);

            done();
        });

        di.register(moduleName, <any>myFunc);
    });

    test('Register multiple and require', async (done) => {
        const moduleNameA = 'test1';
        const moduleNameB = 'test2';

        di.register(moduleNameA, (arg: number) => arg * 2);
        di.register(moduleNameB, (arg: number) => arg * 3);

        let deps: typeof myFunc[] = await di.require([moduleNameA, moduleNameB]);
        expect(deps.length).toBe(2);

        expect(deps[0](2)).toBe(4);
        expect(deps[1](2)).toBe(6);

        done();
    });

    test('Inject dependencies into require/inject function - sync', async (done) => {
        const moduleNameA = 'test1';
        const moduleNameB = 'test2';

        di.register(moduleNameA, (arg: number) => arg * 2);
        di.register(moduleNameB, (arg: number) => arg * 3);

        await di.inject((test1, test2) => {
            expect(test1(2)).toBe(4);
            expect(test2(2)).toBe(6);

            done();
        });
    });

    test('Inject dependencies into require/inject function - async', async (done) => {
        const moduleNameA = 'test1';
        const moduleNameB = 'test2';

        di.inject((test1, test2) => {
            expect(test1(2)).toBe(4);
            expect(test2(2)).toBe(6);

            done();
        });

        di.register(moduleNameA, (arg: number) => arg * 2);
        di.register(moduleNameB, (arg: number) => arg * 3);
    });

    test('Inject dependencies into require/inject function - uglified', async (done) => {
        const moduleNameA = 'test1';
        const moduleNameB = 'test2';

        di.inject(
            (aa, bb) => {
                expect(aa(2)).toBe(4);
                expect(bb(2)).toBe(6);

                done();
            },
            ['test1', 'test2']
        );

        di.register(moduleNameA, (arg: number) => arg * 2);
        di.register(moduleNameB, (arg: number) => arg * 3);
    });

    test('Register compound module after injecting dependencies', async (done) => {
        const moduleNameA = 'test1';
        const moduleNameB = 'test2';

        // register one now
        di.register(moduleNameA, (arg: number) => arg * 2);

        di.injectAndRegister('myCompoundModule', (test1, test2) => {
            return (arg: number) => test1(arg) * test2(arg);
        });

        di.inject((myCompoundModule) => {
            expect(myCompoundModule(2)).toBe(2 * 2 * 2 * 3);

            expect(di.hasPendingRequireRequests()).toBe(false);
            done();
        });

        // only now register the other dependency, should trigger registration of the compound module and only then trigger the inject
        di.register(moduleNameB, (arg: number) => arg * 3);
    });

    test('Unregister a module', async (done) => {
        const moduleName = 'test';
        di.register(moduleName, <any>myFunc);
        expect(Object.keys(di.modules).length).toBe(1);

        di.unregister(moduleName);
        expect(Object.keys(di.modules).length).toBe(0);

        done();
    });
});

describe("dependencyInjector - Autowire mode (initiate a class by injecting it's dependencies in the constructor)", () => {
    test('Initiate a class by injecting dependencies - register deps first', async (done) => {
        // register AutowireClass's dependency first:
        di.register('myClass', new MyClass());
        // Will check AutowireClass's dependencies, then will require & inject them into AutowireClass's constructor and return an instance
        const instance = await di.initiate(AutowireClass);

        expect(instance.testMe()).toBe(10);
        done();
    });

    test('Initiate a class by injecting dependencies - Async, register deps last', async (done) => {
        di.initiate(AutowireClass).then((instance) => {
            expect(instance.testMe()).toBe(10);
            done();
        });

        di.register('myClass', new MyClass());
    });

    test('Initiate a class by injecting dependencies - Async and uglified', async (done) => {
        class AutowireClass2 {
            constructor(private aaa: MyClass) {}
            public testMe() {
                return this.aaa.classFunc(); // use injected method
            }
        }

        di.initiate(AutowireClass2, ['myClass']).then((instance) => {
            expect(instance.testMe()).toBe(10);
            done();
        });

        di.register('myClass', new MyClass());
    });
});

describe('dependencyInjector - parent DIC', () => {
    test('Resolve modules from parent container', async (done) => {
        const parent = new DependencyInjector();
        const child = new DependencyInjector(parent);

        const moduleName = 'test';
        parent.register(moduleName, <any>myFunc);
        child.register('testChild', (arg) => arg * 3);

        let [dep] = <[typeof myFunc]>await child.require(moduleName);
        expect(typeof dep).toBe(typeof myFunc);

        child.inject((testChild) => {
            expect(testChild(10)).toBe(30);

            done();
        });

        let res = dep(2);
        expect(res).toBe(20);
    });
});
