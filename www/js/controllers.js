angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $data) {
  console.log('dash is loading');

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
        for (var id in data) {
          console.log(JSON.stringify(data[id]));
        }
      });
    });

    $scope.deleteRecord = function(id, offline) {
      $data.deleteRecord(id, offline).then(function() {
        messenger.success('Mood record deleted');
      }, function() {
        messenger.error('Couldn\'t delete mood record');
        throw new Error('Deleting a mood record failed',id);
      })
    };    
})

.controller('AccountCtrl', function($scope, $connect, $timeout, $auth, $data, $sync, $localStorage, messenger, $cordovaLocalNotification) {
  $scope.loggedIn = $auth.check();
  $scope.loginForm = {};
  $scope.input = {
    time: new Date()
  };
  var ref = $connect.ref;

  $scope.userEmail = $auth.getUserData() && $auth.getUserData().password.email;

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
    ref.unauth();
    $timeout(function() {
      $scope.loggedIn = $auth.check();
    })
    messenger.success('Logged out');
  }

  $scope.clearReminders = function() {
    $cordovaLocalNotification.cancelAll().then(function () {
      //currently the plugin is broken (not ng-cordova) and will not call this callback
      $scope.reminders = [];
      messenger.success('All reminders cancelled');
    });
    $timeout(function() {
      loadReminders();
      messenger.success('All reminders cancelled');
    }, 500);
  };

  $scope.deleteReminder = function(id) {
    console.log('giving',id);
    $cordovaLocalNotification.cancel(id).then(function() {
      //currently the plugin is broken (not ng-cordova) and will not call this callback
      messenger.success('Cancelled reminder ('+id+')');
    });
    $timeout(function() {
      loadReminders();
      messenger.success('Cancelled reminder ('+id+')');
    }, 500);    
  };

  var loadReminders = function() {
    document.addEventListener('deviceready', function() {
      $cordovaLocalNotification.getScheduledIds().then(function (scheduledIds) {
        $timeout(function() {
          $scope.reminders = scheduledIds;
        });
      });
    });
  };

  loadReminders();

  var createNotification = function() {
    var humanDate = "Daily at "+moment($scope.input.time).format('H:mm');

    document.addEventListener('deviceready', function () {
      window.plugin.notification.local.add({
          id:      humanDate,
          title:   'Reminder',
          message: 'Record your mood now',
          repeat:  'daily',
          date:    $scope.input.time
      });
    });

    $timeout(function() {
      loadReminders();
    }, 500);

    messenger.success('Added reminder');
  };    

  $scope.addReminder = function() {    
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
