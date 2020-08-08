import DependencyInjector from './index';

if ((<any>window).libx == undefined) (<any>window).libx = {};
(<any>window).libx.di = new DependencyInjector();
