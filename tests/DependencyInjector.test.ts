import DependencyInjector from '../src/DependencyInjector';
import { sleep, Deferred } from 'concurrency.libx.js';

class MyClass {
    public clasFunc() {
        return 10;
    }
}

describe('dependencyInjector tests', () => {
    let di: DependencyInjector;

    function myFunc() {
        return 1;
    }

    const myFuncAnonymous = () => 2;

    beforeEach(async (done) => {
        di = new DependencyInjector();
        done();
    });

    test('dependencyInjector-get-backwardCompatibility', async (done) => {
        di.register('a', <any>myFunc); // args order was opposite
        let x: typeof myFunc = di.get('a');
        expect(typeof x).toBe(typeof myFunc);
        let res = x();
        expect(res).toBe(1);
        done();
    });

    test('dependencyInjector-get-explicityName', async (done) => {
        di.register(myFunc, 'a');
        let x: typeof myFunc = di.get('a');
        expect(typeof x).toBe(typeof myFunc);
        let res = x();
        expect(res).toBe(1);
        done();
    });

    test('dependencyInjector-get-implicitName', async (done) => {
        di.register(myFunc);
        let x: typeof myFunc = di.get(myFunc.name);
        expect(typeof x).toBe(typeof myFunc);
        let res = x();
        expect(res).toBe(1);
        done();
    });

    test('dependencyInjector-get-anonymousFunc', async (done) => {
        di.register(myFuncAnonymous, 'a');
        let x: typeof myFunc = di.get('a');
        expect(typeof x).toBe(typeof myFunc);
        let res = x();
        expect(res).toBe(2);
        done();
    });

    test('dependencyInjector-get-class-explicityName', async (done) => {
        di.register(new MyClass(), 'myClass');
        await di.require((myClass: MyClass) => {
            let res = myClass.clasFunc();
            expect(res).toBe(10);
            done();
        });
    });

    test('dependencyInjector-get-class-implicitName', async (done) => {
        let myClass = new MyClass();
        di.register(myClass);
        await di.require((MyClass: MyClass) => {
            let res = MyClass.clasFunc();
            expect(res).toBe(10);
            done();
        });
    });

    test('dependencyInjector-registerResolve', async (done) => {
        di.register(myFunc, '_myFunc');
        di.register(new MyClass(), 'myClass');

        await di.registerResolve('combo', (_myFunc: typeof myFunc, myClass: MyClass) => {
            expect(_myFunc()).toBe(1);
            expect(myClass.clasFunc()).toBe(10);
            return () => 20;
        });

        di.require((combo) => {
            expect(combo()).toBe(20);
            done();
        });
    });

    test('dependencyInjector-require', async (done) => {
        di.register(myFunc);
        await di.require((myFunc) => {
            let res = myFunc();
            expect(res).toBe(1);
            done();
        });
    });

    test('dependencyInjector-requireUgly', async (done) => {
        di.register(myFunc);
        await di.requireUgly(['myFunc'], (newFuncName) => {
            let res = newFuncName();
            expect(res).toBe(1);
            done();
        });
    });

    test('dependencyInjector-require-withoutParentheses', async (done) => {
        di.register(myFunc);
        await di.require((myFunc) => {
            let res = myFunc();
            expect(res).toBe(1);
            done();
        });
    });

    test('dependencyInjector-require-async-waitUntilReady', async (done) => {
        let start = new Date().getTime();
        setTimeout(() => {
            di.register(myFunc);
        }, 100);
        await di.require((myFunc) => {
            let res = myFunc();
            let dur = new Date().getTime() - start;
            expect(dur).toBeLessThanOrEqual(110);
            expect(dur).toBeGreaterThanOrEqual(100);
            expect(res).toBe(1);
            done();
        });
    });

    test('dependencyInjector-require-async-hang', async (done) => {
        let start = new Date().getTime();
        let wasCalled = false;
        di.require((nonExistingFunc) => {
            // should not be called as this dep is never resolved
            wasCalled = true;
            expect(wasCalled).toBe(false);
            done();
        });
        await sleep(100);
        expect(wasCalled).toBe(false);
        done();
    });

    test('dependencyInjector-require-multiple', async (done) => {
        let p1, p2;
        p1 = di.require((a) => {
            expect(a()).toBe(1);
        });
        p2 = di.require((a) => {
            expect(a()).toBe(1);
        });
        di.register(myFunc, 'a');
        await Promise.all([p1, p2]);
        done();
    });

    test('dependencyInjector-inject', async (done) => {
        di.register(myFunc, 'myFunc');
        let res = null;
        di.inject((myFunc) => {
            res = myFunc();
        });
        expect(res).toBe(1);
        done();
    });
});
