import { Deferred } from 'concurrency.libx.js';
import Helpers from './Helpers';

export type ModuleKey = string | symbol;

export default class DependencyInjector {
    public modules: Map<ModuleKey, any> = null;
    private _options = new ModuleOptions();
    private _pendingRequireRequests: PendingRequireRequest[] = [];

    constructor(options?: ModuleOptions) {
        this._options = { ...this._options, ...options };
        this.modules = <Map<ModuleKey, any>>{};
    }

    public register<T>(moduleIdentifier: ModuleKey, instance: T) {
        this.modules[moduleIdentifier] = instance;

        this._recheckPendingRequireRequestsAndTrigger(moduleIdentifier, instance);

        return instance;
    }

    public async require(moduleIdentifiers: ModuleKey[]) {
        const promises: Promise<any>[] = [];
        for (let identifier of moduleIdentifiers) {
            const p = this.requireSingle(identifier);
            promises.push(p);
        }

        return Promise.all(promises);
    }

    public async inject(injectFunc: Function, moduleIdentifiers?: ModuleKey[]) {
        if (moduleIdentifiers == null) moduleIdentifiers = Helpers.getParamNames(injectFunc);
        const modules = await this.require(moduleIdentifiers);
        return injectFunc.apply(injectFunc, modules);
    }

    public async initiate<T>(classPrototype: Class<T>, constructorDependenciesIdentifiers?: ModuleKey[]) {
        const modulesNames = constructorDependenciesIdentifiers || Helpers.getParamNames(classPrototype);
        const deps = await this.require(modulesNames);
        return <T>Reflect.construct(classPrototype, deps);
    }

    public async injectAndRegister<T>(moduleIdentifier: ModuleKey, injectFunc: (...args) => T) {
        const instance = await this.inject(injectFunc);
        this.register(moduleIdentifier, instance);
    }

    public async requireSingle(moduleIdentifier: ModuleKey) {
        const existingModule = this.modules[moduleIdentifier];
        if (existingModule != null) {
            return existingModule;
        }

        const pendingRequire = new PendingRequireRequest(moduleIdentifier);
        this._pendingRequireRequests.push(pendingRequire);

        return pendingRequire.promise;
    }

    public hasPendingRequireRequests() {
        return this._pendingRequireRequests.length > 0;
    }

    private _recheckPendingRequireRequestsAndTrigger<T = any>(newRegisteredModuleIdentifier: ModuleKey, newInstance: T) {
        for (let pendingRequire of [...this._pendingRequireRequests]) {
            if (pendingRequire.moduleIdentifier != newRegisteredModuleIdentifier) continue;

            pendingRequire.promise.resolve(newInstance);
            Helpers.removeItemFromArr(this._pendingRequireRequests, pendingRequire);
        }
    }
}

type Class<T> = new (...args: any[]) => T;
class PendingRequireRequest<T = any> {
    public promise: Deferred<T>;
    constructor(public moduleIdentifier: ModuleKey) {
        this.promise = new Deferred<T>();
    }

    public onResolve(instance: T) {
        return this.promise.resolve(instance);
    }
}

export class ModuleOptions {}
