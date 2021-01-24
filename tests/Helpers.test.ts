import DependencyInjector from "../src/DependencyInjector";
import { sleep, Deferred } from "concurrency.libx.js";
import Helpers from "../src/Helpers";

class MyClass {
	constructor(paramA, paramB,  paramC) {
	}
}
const funcArrow = (paramA, paramB,  paramC) => {
}
const funcNoArrow = (paramA, paramB,  paramC) => {
}
function funcRegular(paramA, paramB,  paramC){
}

describe('Helpers', () => {
    test('getParamNames - get function params of funcArrow', async (done) => {
        let res = Helpers.getParamNames(funcArrow)
        expect(res).toStrictEqual(["paramA", "paramB", "paramC"]);
        done();
    });

    test('getParamNames - get function params of funcNoArrow', async (done) => {
        let res = Helpers.getParamNames(funcNoArrow)
        expect(res).toStrictEqual(["paramA", "paramB", "paramC"]);
        done();
    });

    // TBD - need to properly distinguish that case
    test.skip('getParamNames - get function params of regular function', async (done) => {
        let res = Helpers.getParamNames(funcRegular)
        expect(res).toStrictEqual(["paramA", "paramB", "paramC"]);
        done();
    });

    test('getParamNames - get class params from class\'s constructor', async (done) => {
        let res = Helpers.getParamNames(MyClass)
        expect(res).toStrictEqual(["paramA", "paramB", "paramC"]);
        done();
    });

})

