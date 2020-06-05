import { Deferred } from 'concurrency.libx.js';
import Helpers from './helpers';

export default class DependencyInjector {
    public modules = {};
    private _pendingFunctions: {};
    private static resolverType: (name: string)=>Promise<{}>;
    private _resolver: typeof DependencyInjector.resolverType;

    constructor(resolver?: typeof DependencyInjector.resolverType) {
        this.modules = {};
        this._pendingFunctions = {};
        this._resolver = resolver;
    }

    public register<T>(instance: T, name: string=null): T {
        if (instance == null) throw new Error('DependencyInjector:register: instance cannot be null');

        // backward compatibility where the order of params was opposite
        if (typeof instance == 'string') { 
            let tmp: any = name;
            name = instance;
            instance = tmp;
        }

        if (name == null) name = Helpers.tryGetInstanceTypeName(instance);
        this.modules[name] = instance;
        this._treatReadyPendingFunctions();
        return instance;
    }

    public async registerResolve(name, func) {
        var ret = new Deferred();
        var realInstance = await this.require(func);
        this.register(realInstance, name)
        ret.resolve(realInstance);
        return ret;
    }

    public get<T>(name: string): T {
        if (name == null) name = Helpers.tryGetInstanceTypeName<T>();

        var ret = this.modules[name];

        if (ret == null && this._resolver != null) { // try to require a module
            ret = this._resolver(name);
        }

        return ret;
    }

    private resolve<T>(func: Function, isGetArray=false): T[] {
        var modulesName = Helpers.getParamNames(func);
        if (modulesName == null) return null
        if (modulesName.length == 1 && !isGetArray) return this.get(modulesName);

        var ret = [];
        modulesName.forEach(m=> ret.push(this.get(m)));
        return ret;
    }

    public inject (func) {
        var modules = this.resolve(func, true);
        return func.apply(func, modules);
    }

    public async require<T>(func: Function): Promise<T> {
        var modulesName = Helpers.getParamNames(func);
        return this.requireUgly(modulesName, func);
    }

    public async requireUgly<T>(depsArr, func): Promise<T> {
        var ret = new Deferred();

        var modules = [];
        var modulesName = depsArr;
        var wasMissing = false;
        modulesName.forEach(m=> { 
            var _mod = this.get(m);
            if (_mod != null) modules.push(_mod);
            else {
                wasMissing = true;
                if (this._pendingFunctions[m] == null) this._pendingFunctions[m] = [];
                this._pendingFunctions[m].push(new DependencyInjector.PendingFunc(func, ret));
            }
        })
        if (!wasMissing) {
            var res = func.apply(func, modules);
            ret.resolve(res);
        }

        return ret;
    }

    private static PendingFunc = class<T> {
        public func: Function;
        public promise: Promise<T>;
        constructor(func, promise) {
            this.func = func;
            this.promise = promise;
        }
    }

    private _treatReadyPendingFunctions () {
        var pendingModules = Helpers.getKeys(this._pendingFunctions); //libx.getCustomProperties(this.pendingFunctions)
        if (Helpers.isEmpty(pendingModules)) return;

        pendingModules.forEach(modName=>{
            var _mod = this.modules[modName];
            if (_mod == null) return;
            var pendingArr = [...this._pendingFunctions[modName]];
            pendingArr.forEach(pending=>{
                var modulesName = Helpers.getParamNames(pending.func);

                var isReady = true;
                modulesName.forEach(modName2=>{
                    var _mod2 = this.modules[modName];
                    if (_mod2 == null) {
                        isReady = false;
                        return false;
                    }
                })

                if (!isReady) return;

                if (this._pendingFunctions[modName].length == 1) delete this._pendingFunctions[modName];
                else Helpers.removeItemFromArr(this._pendingFunctions[modName], pending)

                this.require(pending.func).then(res=>{
                    pending.promise.resolve(res);
                });
            })
        });
    }

}
	