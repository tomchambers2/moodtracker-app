'use strict';

/**
 * @ngdoc directive
 * @name moodtrackerWebApp.directive:syncChecker
 * @description
 * # syncChecker
 */
angular.module('directives', [])
  .directive('syncChecker', function ($rootScope, $timeout) {
    return {
      restrict: 'E',
      template: '<div class="bar bar-subheader bar-energized text-center bar-alert" ng-if="alert.msg" type="info" close="close.alert()"><i class="icon ion-alert-circled"></i><h5>{{alert.msg}}</h5> <button class="button button-small" ng-click="alert.callback()">Sync with account</button></div>',
      link: function postLink(scope, element, attrs) {
        var close = {};
      	close.alert = function() {
      		$timeout(function() {
      			scope.alert = {};
      		});
      	};

      	$rootScope.$on('unauthSync', function(data, number, callback) {
      		$timeout(function() {
	      		scope.alert = {
	      			msg: 'You have '+number+' unsynced anonymous mood records',
	      			callback: callback
	      		}
      		});
      	});
      }
    };
  });
