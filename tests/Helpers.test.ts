import DependencyInjector from '../src/DependencyInjector';
import { sleep, Deferred } from 'concurrency.libx.js';
import Helpers from '../src/Helpers';

// Different JS function/class declarations/expressions:
class MyClass {
    constructor(paramA, paramB, paramC) {}
}
const funcArrow = (paramA, paramB, paramC) => {};
const funcArrowNoParentheses = (paramA) => {};
function funcExpression(paramA, paramB, paramC) {}
function functionDouble(paramA, paramB, paramC) {}
const funcSelfExec = (paramA, paramB, paramC) => {};
function* yieldAndReturn(paramA, paramB, paramC) {}

describe('Helpers', () => {
    test('getParamNames - get function params of funcArrow', async (done) => {
        let res = Helpers.getParamNames(funcArrow);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test('getParamNames - get function params of funcArrowNoParentheses', async (done) => {
        let res = Helpers.getParamNames(funcArrowNoParentheses);
        expect(res).toStrictEqual(['paramA']);
        done();
    });

    test('getParamNames - get function params of funcExpression function', async (done) => {
        let res = Helpers.getParamNames(funcExpression);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test('getParamNames - get class params from functionDouble function', async (done) => {
        let res = Helpers.getParamNames(functionDouble);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test('getParamNames - get class params from funcSelfExec function', async (done) => {
        let res = Helpers.getParamNames(funcSelfExec);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test('getParamNames - get class params from yieldAndReturn function', async (done) => {
        let res = Helpers.getParamNames(yieldAndReturn);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test("getParamNames - get class params from class's constructor", async (done) => {
        let res = Helpers.getParamNames(MyClass);
        expect(res).toStrictEqual(['paramA', 'paramB', 'paramC']);
        done();
    });

    test('isArray - positive', async (done) => {
        let res = Helpers.isArray([1, 2, 3]);
        expect(res).toEqual(true);
        done();
    });

    test('isArray - negative', async (done) => {
        let res = Helpers.isArray('123');
        expect(res).toEqual(false);
        done();
    });
});
