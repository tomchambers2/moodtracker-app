angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $data) {
  $scope.saveMood = function(mood) {
    $data.saveMood(mood);
  };  
})

.controller('HistoryCtrl', function($scope, $data, $timeout, $auth) {
    $scope.loggedIn = $auth.check();

    $scope.mood = {};
    $data.getMoodlogNumbers(function(data) {        
      $timeout(function() {
        $scope.mood.data = data;
      });
    });
})

.controller('AccountCtrl', function($scope, $connect, $timeout, $auth, $data, $sync, $localStorage, messenger, $cordovaLocalNotification) {
  $scope.loggedIn = $auth.check();
  $scope.loginForm = {};
  $scope.input = {
    time: Date.now()
  };
  var ref = $connect.ref;

  var afterLogin = function(error, authData) {
    if (error) { 
      console.log(error); 
      return;
    }
    $scope.loggedIn = $auth.check();
    $scope.$apply();

    $sync.sync();

    messenger.success('Logged in');
  };

  $scope.doLogin = function() {
   ref.authWithPassword({
      email    : $scope.loginForm.email,
      password : $scope.loginForm.password
    }, afterLogin);     
  }

  $scope.doRegister = function() {
    ref.createUser({
      email    : $scope.loginForm.email,
      password : $scope.loginForm.password
    }, function(error) {
      if (error) {
        console.log(error);
        messenger.danger(error);
        return;
      }
      messenger.success('Created account');
      $scope.doLogin($scope.loginForm.email, $scope.loginForm.password);
    });
  }

  $scope.doLogout = function() {
    $timeout(function() {
      ref.unauth();
    })
    messenger.success('Logged out');
  }


    var createNotification = function() {
      var now                  = new Date().getTime(),
          _60_seconds_from_now = new Date(now + 60*60*1000);

      document.addEventListener('deviceready', function () {
        window.plugin.notification.local.add({
            id:      1,
            title:   'Reminder',
            message: 'Record your mood now',
            repeat:  'daily',
            date:    _60_seconds_from_now
        });
      });

      messenger.success('Added reminder');
    };    

    $scope.addReminder = function() {
      console.log($scope.input.time);
      document.addEventListener('deviceready', function () {
        window.plugin.notification.local.hasPermission(function(granted) {
          if (!granted) {
            window.plugin.notification.local.promptForPermission(function(granted) {
              if (granted) {
                createNotification();
              }
            });
          } else {
            createNotification();
          }
        })
      }, false);
    }.bind(this);
});
