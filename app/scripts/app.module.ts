/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-resource.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />

'use strict';

angular.module('emuwebApp', ['ui', 'ngAnimate', 'angular.filter', 'btford.markdown'])
	.config(function ($locationProvider) {
		$locationProvider.html5Mode(true);
  });
