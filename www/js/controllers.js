angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $data) {
  mixpanel.track('record', { device: 'mobile' });

  $scope.saveMood = function(mood) {
    mixpanel.track('save_mood', { level: mood });
    $data.saveMood(mood);
  };  
})

.controller('HistoryCtrl', function($scope, $data, $timeout, $auth, messenger) {
    mixpanel.track('main', { device: 'mobile' });

    $scope.loggedIn = $auth.check();
 
    $scope.mood = {};
    $data.getMoodlogNumbers(function(data) {        
      $timeout(function() {
        $scope.mood.data = data;
      });
    });

    $scope.deleteRecord = function(id, offline) {
      mixpanel.track('deleteMood');
      $data.deleteRecord(id, offline).then(function() {
        messenger.success('Mood record deleted');
      }, function() {
        messenger.error('Couldn\'t delete mood record');
        throw new Error('Deleting a mood record failed',id);
      })
    };    
})

.controller('AccountCtrl', function($scope, $connect, $timeout, $auth, $data, $sync, $localStorage, messenger, $cordovaLocalNotification) {
  mixpanel.track('settings', { device: 'mobile' });

  $scope.loggedIn = $auth.check();
  $scope.loginForm = {};
  $scope.resetForm = {};
  $scope.changeForm = {};
  $scope.emailForm = {};
  $scope.input = {
    time: new Date()
  };
  var ref = $connect.ref;

  $scope.userEmail = $auth.getUserData() && $auth.getUserData().password.email;

  var afterLogin = function(error, authData) {
    if (error) { 
      console.log(error); 
      messenger.error(error.message);
      return;
    }
    $scope.loggedIn = $auth.check();
    $scope.$apply();

    $sync.sync();

    messenger.success('Logged in');
  };

  $scope.doLogin = function() {
    mixpanel.track('login');

    if (!$scope.loginForm.email && !$scope.loginForm.password) {
      messenger.error('Enter email and password then tap login');
      return;
    } else if (!$scope.loginForm.email) {
      messenger.error('Enter your email then tap login');
      return;
    } else if (!$scope.loginForm.password) {
      messenger.error('Enter your password then tap login');
      return;
    }

   ref.authWithPassword({
      email    : $scope.loginForm.email,
      password : $scope.loginForm.password
    }, afterLogin);     
  }

  var loginAfterEmailChange = function(email, password) {
   ref.authWithPassword({
      email    : email,
      password : password
    }, afterLogin);    
  }

  $scope.doRegister = function() {
    mixpanel.track('register');
    if (!$scope.loginForm.email && !$scope.loginForm.password) {
      messenger.error('Enter email and password then tap register');
      return;
    } else if (!$scope.loginForm.email) {
      messenger.error('Enter email then tap register');
      return;
    } else if (!$scope.loginForm.password) {
      messenger.error('Enter a password then tap register');
      return;
    }

    ref.createUser({
      email    : $scope.loginForm.email,
      password : $scope.loginForm.password
    }, function(error) {
      if (error) {
        messenger.error(error.message);
        return;
      }
      messenger.success('Created account');
      $scope.doLogin($scope.loginForm.email, $scope.loginForm.password);
    });
  }

  $scope.doPasswordReset = function() {
    mixpanel.track('passwordReset');
    if (!$scope.resetForm.email) {
      messenger.warning('Please enter the email you want to reset the password for');
    }
    ref.resetPassword({
      email: $scope.resetForm.email
    }, function(error) {
      if (error) {
        messenger.error(error.message);
        throw new Error('Could not reset password',$scope.resetForm.email);
      }
      messenger.success('Your new password has been emailed to '+$scope.resetForm.email);
      $timeout(function() {
        $scope.resetForm.email = '';
      })
    });
  }

  $scope.doChangeEmail = function() {
    mixpanel.track('changeEmail');
    if (!$scope.emailForm.newEmail) {
      messenger.warning('Please enter the new email address');
      return;
    } else if (!$scope.emailForm.password) {
      messenger.warning('Please enter your current password to change email');
      return;
    }

    ref.changeEmail({
      oldEmail: $auth.getUserData().password.email,
      newEmail: $scope.emailForm.newEmail,
      password: $scope.emailForm.password
    }, function(error) {
      if (error) {
        messenger.error(error.message);
        throw new Error('Could not reset password '+$scope.emailForm.email);
      }
      loginAfterEmailChange($scope.emailForm.email, $scope.emailForm.password);
      $scope.email = $scope.emailForm.newEmail;
      messenger.success('Your email has been changed to '+$scope.emailForm.email);
    });    
  }

  $scope.doChangePassword = function() {
    mixpanel.track('changePassword');
    if (!$scope.changeForm.oldPassword || !$scope.changeForm.newPassword) {
      messenger.warning('Please enter both your old and new password');
      return;
    }

    ref.changePassword({
      email: $auth.getUserData().password.email,
      oldPassword: $scope.changeForm.oldPassword,
      newPassword: $scope.changeForm.newPassword
    }, function(error) {
      if (error) {
        messenger.error(error.message);
        throw new Error('Could not reset password');
      }
      messenger.success('Your password has been changed');
      $scope.changeForm = {};
    });
  }

  $scope.doLogout = function() {
    mixpanel.track('logout');
    ref.unauth();
    $timeout(function() {
      $scope.loggedIn = $auth.check();
    })
    messenger.success('Logged out');
  }

  $scope.clearReminders = function() {
    mixpanel.track('clearReminders');
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
    mixpanel.track('deleteReminder');
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

  $scope.debug = function() {
    alert($localStorage.getAll())
  }

  $scope.addReminder = function() {  
    mixpanel.track('addReminder');  
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
