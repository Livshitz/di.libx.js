import { Deferred } from 'concurrency.libx.js';
import Helpers from './Helpers';

export type ModuleKey = string | number | symbol;

/**
 *
 */

type Modules<T = any> = { [key: symbol | string]: T };

export class DependencyInjector {
    public modules: Modules = {};
    public parent: DependencyInjector = null;
    private _options = new ModuleOptions();
    private _pendingRequireRequests: PendingRequireRequest[] = [];

    constructor(parent?: DependencyInjector, options?: ModuleOptions) {
        this._options = { ...this._options, ...options };
        this.parent = parent;
    }

    /**
     * Proxy access to modules that automatically waits for registration if needed
     */
    public get proxy(): Modules {
        return new Proxy({} as Modules, {
            get: (target, prop: string | symbol) => {
                const moduleIdentifier = prop as ModuleKey;
                const existingModule = this.modules[moduleIdentifier];

                if (existingModule != null) {
                    return existingModule;
                }

                if (this.parent != null) {
                    const parentModule = this.parent.modules[moduleIdentifier];
                    if (parentModule != null) {
                        return parentModule;
                    }
                }

                // If module doesn't exist, return a proxy that will wait for registration
                return new Proxy({}, {
                    get: (_, method) => {
                        return async (...args: any[]) => {
                            const instance = await this.require(moduleIdentifier);
                            return (instance as any)[method](...args);
                        };
                    }
                });
            }
        });
    }

    /**
     * Register an instance by it's identifier, so it could be required later.
     * Will trigger all pending requires if exists and waiting for this specific module (by identifier).
     * If the instance is a Promise, it will be resolved before triggering any pending requires.
     * @param moduleIdentifier  Unique identifier. Registering with existing identifier will throw.
     * @param instance          Function, object, or Promise
     * @param noOverride        If true, will throw if module already exists
     * @return                  Returns a Promise that resolves with the final instance
     */
    public async register<T>(moduleIdentifier: ModuleKey, instance: T | Promise<T>, noOverride = false): Promise<T> {
        if (moduleIdentifier == null) throw `DependencyInjector: identifier cannot be null`;
        if (this.modules[moduleIdentifier] != null && noOverride)
            throw `DependencyInjector: Module already exists!, identifier: ${moduleIdentifier.toString()}`;

        // Store the instance/promise in modules while it's resolving
        this.modules[moduleIdentifier] = instance;

        // If instance is a Promise, wait for it to resolve
        const resolvedInstance = instance instanceof Promise ? await instance : instance;

        // Update the module with the resolved value
        this.modules[moduleIdentifier] = resolvedInstance;

        // Trigger any pending requires with the resolved value
        this._recheckPendingRequireRequestsAndTrigger(moduleIdentifier, resolvedInstance);

        return resolvedInstance;
    }

    /**
     * Register an async module by its identifier.
     * The instance can be either a Promise or a regular value.
     * If it's a Promise, it will be resolved before triggering any pending requires.
     * @param moduleIdentifier  Unique identifier. Registering with existing identifier will throw.
     * @param instance          Promise or regular value
     * @param noOverride        If true, will throw if module already exists
     * @return                  Returns a Promise that resolves with the final instance
     */
    public async registerAsync<T>(moduleIdentifier: ModuleKey, instance: T | Promise<T>, noOverride = false): Promise<T> {
        if (moduleIdentifier == null) throw `DependencyInjector: identifier cannot be null`;
        if (this.modules[moduleIdentifier] != null && noOverride)
            throw `DependencyInjector: Module already exists!, identifier: ${moduleIdentifier.toString()}`;

        // Store the promise in modules while it's resolving
        this.modules[moduleIdentifier] = instance;

        // If instance is a Promise, wait for it to resolve
        const resolvedInstance = instance instanceof Promise ? await instance : instance;

        // Update the module with the resolved value
        this.modules[moduleIdentifier] = resolvedInstance;

        // Trigger any pending requires with the resolved value
        this._recheckPendingRequireRequestsAndTrigger(moduleIdentifier, resolvedInstance);

        return resolvedInstance;
    }

    /**
     * Synchronously get a module.
     * @param moduleIdentifier Module's unique identifier
     * @return                  Returns the module if found
     */
    public get<T = any>(moduleIdentifier: ModuleKey): T {
        return this.modules[moduleIdentifier];
    }

    /**
     * Asynchronously require a module.
     * If the module isn't currently available will wait until it become available.
     * Beware of dead-lock if the promise is awaited in same context where the dependency is later registered.
     * @param moduleIdentifier Module's unique identifier
     * @return                  Returns a promise that can be awaited until the dependency is ready
     */
    public async require<T = any>(moduleIdentifier: ModuleKey): Promise<T> {
        // if (Helpers.isArray(moduleIdentifier)) return await this.requireMany(moduleIdentifier as ModuleKey[]);
        // else
        return await this.requireSingle(moduleIdentifier as ModuleKey);
    }

    /**
     * Asynchronously require array of modules.
     * If not all modules are currently available will wait until they become available.
     * Beware of dead-lock if the promise is awaited in same context where the dependency is later registered.
     * @param moduleIdentifiers Unique identifier as single or array
     * @return                  Returns a promise that can be awaited until ALL dependencies are ready
     */
    public async requireMany<T = any>(moduleIdentifiers: ModuleKey[]): Promise<T[]> {
        const promises: Promise<T>[] = [];

        for (let identifier of moduleIdentifiers) {
            const p = this.requireSingle(identifier);
            promises.push(p);
        }

        return await Promise.all(promises);
    }

    /**
     * Asynchronously require dependencies by function's signature, wait for all dependencies to be available and then call the function.
     * @param injectFunc        Function with arguments, where is argument is a dependency to be injected. Dependency modules are extracted automatically from argument names or if `moduleIdentifiers` is provided will use that as identifiers and will inject them based on argument position.
     * @param moduleIdentifiers    Manually provide dependencies. Useful if code was obfuscated and signature don't infer dependencies names.
     * @return                  Returns a promise that can be awaited until ALL dependencies have been registered
     */
    public async inject(injectFunc: Function, moduleIdentifiers?: ModuleKey[]) {
        if (moduleIdentifiers == null) moduleIdentifiers = Helpers.getParamNames(injectFunc);
        const modules = await this.requireMany(moduleIdentifiers);
        return injectFunc.apply(injectFunc, modules);
    }

    /**
     * Asynchronously detect dependencies of a class, wait for them and then initiate an instance of a given class.
     * @param classPrototype                        Class to be initiated. Dependencies are derived automatically from class's constructor signature or if `constructorDependenciesIdentifiers` is provided.
     * @param constructorDependenciesIdentifiers    Manually provide dependencies. Useful if code was obfuscated and signature don't infer dependencies names.
     * @returns                                     Instance of the give class
     */
    public async initiate<T>(classPrototype: Class<T>, constructorDependenciesIdentifiers?: ModuleKey[]) {
        const modulesNames = constructorDependenciesIdentifiers || Helpers.getParamNames(classPrototype);
        const deps = await this.requireMany(modulesNames);
        return <T>Reflect.construct(classPrototype, deps);
    }

    /**
     * Asynchronously injects dependencies into a given function and the returned value will be registered as a new module.
     * @param moduleIdentifier  The identifier of the new compound module
     * @param injectFunc        Function with arguments, where is argument is a dependency to be injected. Dependency modules are extracted automatically from argument names or if `moduleIdentifiers` is provided will use that as identifiers and will inject them based on argument position.
     * @returns                 Instance the new compound module
     */
    public async injectAndRegister<T>(moduleIdentifier: ModuleKey, injectFunc: (...args) => T) {
        const instance = await this.inject(injectFunc);
        return this.register(moduleIdentifier, instance);
    }

    /**
     * Check if there are any pending resolution for `require`
     */
    public hasPendingRequireRequests() {
        return this._pendingRequireRequests.length > 0;
    }

    /**
     * Remove a module by it's identifier
     * @param moduleIdentifier  The identifier of the module to be deleted
     */
    public unregister(moduleIdentifier: ModuleKey) {
        delete this.modules[moduleIdentifier];
    }

    protected async requireSingle(moduleIdentifier: ModuleKey) {
        let existingModule = this.modules[moduleIdentifier];
        if (existingModule == null && this.parent != null) existingModule = this.parent.modules[moduleIdentifier];
        if (existingModule != null) {
            return existingModule;
        }

        const pendingRequire = new PendingRequireRequest(moduleIdentifier);
        this._pendingRequireRequests.push(pendingRequire);

        return pendingRequire.promise;
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

export default new DependencyInjector();
