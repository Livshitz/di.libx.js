import DependencyInjector from "./DependencyInjector";


export default class App {
	constructor() {
	}

	public async run() {
		console.log('Hello World!');

		return true;
	}
}

class Program {
	public static async main() {
		let error: Error = null;

		try {
			console.log('----------------');
			let app = new App();
			await app.run();
			console.log('DONE');
		}
		catch (err) {
			error = err;
		} finally {
			if (error) {
				console.error('----- \n [!] Failed: ', error);
				return process.exit(1);
			}
			process.exit(0);
		}
	}
}

Program.main(); // Uncomment if you want to use this file as node script and self execute