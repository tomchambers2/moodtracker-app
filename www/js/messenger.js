angular.module('variantTools', [])

.service('messenger', ['$cordovaToast', function($cordovaToast) {
  var send = function(message) {
    document.addEventListener('deviceready', function() {
      $cordovaToast.showShortTop(message);
    });
  };

  return {
    warning: send,
    error: send,
    success: send
  }
}])
