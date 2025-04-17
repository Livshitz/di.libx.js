import { DependencyInjector } from "../src/DependencyInjector";
import { sleep } from "concurrency.libx.js";

const di = new DependencyInjector();

// Access the module through proxy - will wait for registration
(async () => {
	// Access the module through proxy - will wait for registration
	const result = await di.proxy.myModule.sayHello();
	console.log(result); // Will print 'Hello!' after the module is registered
})();

// Register a module later
setTimeout(() => {
	di.register('myModule', {
		sayHello: async () => {
			console.log('before sleep');
			await sleep(2000);
			console.log('after sleep');
			return 'Hello!';
		}
	});
}, 1000);
