'use strict';

/**
 * @ngdoc directive
 * @name moodtrackerWebApp.directive:syncChecker
 * @description
 * # syncChecker
 */
angular.module('directives', [])
  .directive('syncChecker', function ($rootScope, $timeout, $sync) {
    return {
      restrict: 'E',
      scope: {},
      template: '<div class="cf bar bar-subheader bar-energized text-center bar-alert" type="info" ng-if="alert.msg" close="close.alert()"><i class="icon ion-alert-circled"></i><h5>{{alert.msg}}</h5><div class="button-bar padding"><button class="button button-small button-assertive" ng-click="clear()">Delete data</button><button class="button button-small button-balanced" ng-click="sync()">Sync data</button></div></div>',
      link: function postLink(scope, element, attrs) {
        $rootScope.$on('unauthSync', function(data, number, callback, clearCallback) {
          scope.alert = {};

          scope.sync = function() {
            callback();
            scope.alert = null;
          };

          scope.clear = function() {
            clearCallback();
            scope.alert = null;
          } 
                   
          $timeout(function() {
            scope.alert = {
              msg: 'You have '+number+' unsynced anonymous mood records. Do you want to sync them with this account?',
              callback: callback
            }
          });
        });

        $sync.checkUnauthSync();
      }
    };
  });
