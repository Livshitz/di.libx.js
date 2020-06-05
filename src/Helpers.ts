export default class Helpers {
    private static STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    private static ARGUMENT_NAMES = /([^\s,]+)/g;

    public static getParamNames = function(func) { 
		var fnStr = func.toString().replace(Helpers.STRIP_COMMENTS, '');
		if (fnStr.match(/^\s*class\s+/) != null) return null;
		var m = fnStr.match(/^\(?(?:async\s?)?(?:function\s?)?\(?([\w\d\,\s\$\_]+)\)?/);
		if (m == null || m.length < 1) return null;
		var params = m[1].replace(/\s/g, '');
		var result = params.split(',');
		// var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		return result;
    }
    
    public static getKeys = (obj)=>{
        return Object.keys(obj);
    }

    public static isEmpty = (obj)=>{
        if (obj == null) return true;
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }

        return JSON.stringify(obj) === JSON.stringify({});
    }

    public static removeItemFromArr = (arr, item) =>{
        var index = arr.indexOf(item);
		if (index > -1) {
			arr.splice(index, 1);
		}
		return arr;
    }

    public static tryGetInstanceTypeName = function<T>(instance?: T): string {
        if (instance == null) return null;
        if (typeof instance == 'function') {
            if (instance.name == '') throw new Error('Helpers:tryGetInstanceName: Cannot imply instance name from anonymous functions');
            return instance.name;
        }
        if (instance.constructor?.name && instance.constructor?.name != 'Function') return instance.constructor?.name;

        return typeof instance;
    }
}
