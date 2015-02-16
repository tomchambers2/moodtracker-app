'use strict';

angular.module('moodLogging', [])

.factory('$connect', [function() {
  return {
    ref: new Firebase('https://moodtrackerapp.firebaseio.com')
  };
}])

.factory('$auth', ['$connect','$localStorage','messenger', function($connect,$localStorage,messenger) {
  var ref = $connect.ref;

  var self = this;

  return {
    check: function() {
      var authData = ref.getAuth();
      return !!authData;
    },

    uid: function() {
      return ref.getAuth().uid;
    },

    getUserData: function() {
      var authData = ref.getAuth();
      return authData;
    },

    doLogout: function() {
      $localStorage.set('moodCache', null);

      messenger.success('Logged out');

      return $connect.ref.unauth();
    }
  };
}])

.service('$data', ['$connect', '$q', '$auth', '$localStorage', '$connection', 'messenger', '$rootScope', function($connect, $q, $auth, $localStorage, $connection, messenger, $rootScope) {
  var ref = $connect.ref;

  var appendOfflineData = function(data) {
    if (!$auth.uid) return;

    var localData = $localStorage.getObject($auth.uid+'offlineMoods');

    if (!localData.length) return data;
    if (!data) {
      data = {};
    };

    for (var i = 0; i < localData.length; i++) {
      localData[i].offline = 'offline';
      data[localData[i].userTimestamp] = localData[i];
      data[localData[i].userTimestamp].id = localData[i].userTimestamp;
    };

    return data;
  }

  var appendUnauthData = function(data) {
    var anonData = $localStorage.getObject('moods');

    if (!anonData.length) return data;
    if (!data) {
      data = {};
    };    

    for (var i = 0; i < anonData.length; i++) {
      anonData[i].offline = 'unauth';
      data[anonData[i].userTimestamp] = anonData[i];
      data[anonData[i].userTimestamp].id = anonData[i].userTimestamp;
    };
    return data;
  }  

  var getMoodlogNumbers = function(callback) {
    var data;

    function appendData() {
      for (var id in data) {
        data[id].id = id;
      }
      var appendedData = appendOfflineData(data);
      appendedData = appendUnauthData(appendedData);
      console.log('sending appended data',appendedData);
      callback(appendedData);  
    }

    $rootScope.$on('moods_changed', function() {
      appendData();
      callback(appendedData);       
    });

    if ($connection.getStatus() && $auth.check()) {
      //online and logged in - show them their data + offline data + unauth data
      console.log('Online. Authed. Showing fb data + offline + unauth');
      ref.child('moodlogNumbers').child($auth.getUserData().uid).on('value', function(rawData) {
        data = rawData.val();
        appendData();
      }, function(err) {
        throw new Error('failed to get mood data',err);
      }); 
    } else if ($auth.check()) {
      console.log('Offline. Authed. Showing offline + unauth');
      //authenticated, but not online - use this user's cached data + offline + unauth
      data = null;
      appendData();

      ref.child('moodlogNumbers').child($auth.getUserData().uid).on('value', function(rawData) {
        data = rawData.val();
        appendData();  
      }, function(err) {
        throw new Error('failed to get mood data',err);
      }); 
    } else {
      console.log('Offline. Unauthed. Showing unauth');
      data = null;
      //user is offline and not authed - show unauth data
      appendData();     
    }
  };

  var saveMood = function(mood) {
    var data = {
        level: mood,
        serverTimestamp: Firebase.ServerValue.TIMESTAMP,
        userTimestamp: Date.now()
    };

    if (!$auth.check()) {
      $localStorage.push('moods', data);
      messenger.warning('You\'re not logged in. Mood saved locally. Login or register to sync.');
    };

    if (!$connection.getStatus()) {
      $localStorage.push($auth.uid+'offlineMoods', data);
      messenger.warning('You\'re offline. Mood saved locally. Will be synced automatically when next online');
      return;
    };

    var authData = $auth.getUserData();
    if (authData) {
      ref.child('moodlogNumbers').child(authData.uid).push(data, function(error) {
        if (error) {
          messenger.error('Something went wrong and your mood wasn\'t saved')
          throw new Error(error, 'Mood logging failed');
        }

        messenger.success('Mood saved successfully');
      });      
    }
  };   

  var deleteRecord = function(id, offline) {
    var authData = $auth.getUserData();

    console.log('deleting',id,offline);

    return $q(function(resolve, reject) {
      if (offline==='offline') {
        id = parseInt(id, 10);
        $localStorage.removeByUserTimestamp($auth.uid+'offlineMoods',id);
        $rootScope.$broadcast('moods_changed');
      } else if (offline==='unauth') {
        id = parseInt(id, 10);
        $localStorage.removeByUserTimestamp('moods',id);
        $rootScope.$broadcast('moods_changed');
      } else { 
        var onComplete = function(error) {
          if (error) {
            reject();
          } else {
            resolve();
          }
        };
        console.log("ID",id);
        ref.child('moodlogNumbers').child(authData.uid).child(id).remove(onComplete);
      }
    });
  };

  return {
    ref: ref,
    getMoodlogNumbers: getMoodlogNumbers,
    saveMood: saveMood,
    deleteRecord: deleteRecord
  };
}])

.service('$sync', ['$connect', '$auth', '$localStorage', '$rootScope','$timeout','messenger', function($connect, $auth, $localStorage, $rootScope, $timeout, messenger) {
  var ref = $connect.ref;

  var doSync = function(key) {
    var data = $localStorage.getObject(key);
    if (data.length>0) {
      for (var i = data.length - 1; i >= 0; i--) {
        ref.child('moodlogNumbers').child($auth.getUserData().uid).push(data[i], function(error) {
          if (error) {
            messenger.error('Aborting due to sync failure');
            throw new Error("error syncing", error, 'user data:', $auth.getUserData());
          } else {
            $localStorage.pop(key);
            $rootScope.$emit('moods_changed');
          }
        });
      }
      messenger.success('Synced '+data.length+' records');
    }        
  };  

  var unauthSync = function() {
    doSync('moods');
  };

  var unauthClear = function() {
    $localStorage.setObject('moods', []);
    $rootScope.$emit('moods_changed');
    messenger.success('Deleted anonymous moods');
  };  

  var checkUnauthSync = function() {
    if (!$auth.check()) return;
    var unauthLength = $localStorage.length('moods');
    if (unauthLength) {
      $rootScope.$emit('unauthSync', unauthLength, unauthSync, unauthClear);
    };
  };      

  var sync = function() {
    if ($auth.check()) {
      var createLocalCache = function(data) {
        $localStorage.setObject('moodCache', data)
      };

      ref.child('moodlogNumbers').child($auth.getUserData().uid).on('value', function(data) {
        createLocalCache(data.val());
      }, function(err) {
        throw new Error('failed to get mood data',err);
      });

      doSync($auth.uid+'offlineMoods');

      var unauthLength = $localStorage.length('moods');
      if (unauthLength) {
        $rootScope.$emit('unauthSync', unauthLength, unauthSync, unauthClear);
      };
    }
  };

  return {
    sync: sync,
    checkUnauthSync: checkUnauthSync
  }
}]);

angular.module('utils', [])

.factory('$localStorage', ['$window','$rootScope', function($window, $rootScope) {
  return {
    set: function(key, value) {
      $window.localStorage[key] = value;
    },
    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    setObject: function(key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function(key) {
      return JSON.parse($window.localStorage[key] || '{}');
    },
    push: function(key, value) {
      var data = $window.localStorage[key];
      if (data) {
        data = JSON.parse(data);
      } else {
        data = [];
      }
      data.push(value);
      $window.localStorage[key] = JSON.stringify(data);
    },
    length: function(key) {
      var data = $window.localStorage[key];
      if (data) {
        data = JSON.parse(data);
      } else {
        data = [];
      }
      return data.length;      
    },
    pop: function(key) {
      var data = $window.localStorage[key];
      if (data) {
        data = JSON.parse(data);
        var index = data.length - 1;
        data.splice(index, 1);
      } else {
        data = [];
      }
      $window.localStorage[key] = JSON.stringify(data);
    },
    removeByUserTimestamp: function(key, userTimestamp) {
      var data = $window.localStorage[key];
      if (data) {
        data = JSON.parse(data);
        data = _.reject(data, { userTimestamp: userTimestamp });
      } else {
        data = [];
      }

      $window.localStorage[key] = JSON.stringify(data);
    }
  };
}])

.service('$connection', ['$sync', function($sync) {
  var connectedRef = new Firebase('https://moodtrackerapp.firebaseio.com/.info/connected');

  var status;

  connectedRef.on('value', function(snap) {
    if (snap.val()) {
      status = true;

      $sync.sync();
    } else {
      status = false;
    }
  }); 

  return {
    getStatus: function() {
      return status;
    }
  };
}]);