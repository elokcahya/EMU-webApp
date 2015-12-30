/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-resource.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />

import {UpgradeAdapter} from 'angular2/upgrade';
var adapter = new UpgradeAdapter();

angular.module('emuwebApp', ['ui', 'ngAnimate', 'angular.filter', 'btford.markdown'])
	.config(function ($locationProvider) {
		$locationProvider.html5Mode(true);
	});

adapter.bootstrap(document.body, ['emuwebApp']);
