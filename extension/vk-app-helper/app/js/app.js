"use strict";

angular.module('VKAppHelper', ['ui.router', 'ui.bootstrap', 'VKOAuth', 'truncate', 'ui.codemirror'])

.factory('Apps', ['$q', function ($q) {
  return {
    apps: [],
    load: function () {
      var deferred = $q.defer();
      var that = this;
      // load apps
      chrome.storage.local.get({'apps': []}, function (items) {
        that.apps = items.apps;
        deferred.resolve(that);
      });
      return deferred.promise;
    },
    save: function () {
      var deferred = $q.defer();
      var apps = this.apps;
      // we should strip $$hashKeys
      apps = angular.toJson(apps);
      apps = angular.fromJson(apps);
      // saves apps
      chrome.storage.local.set({'apps': apps}, function () {
        console.log('Saved to the chrome local storage');
        deferred.resolve();
      });
      return deferred.promise;
    },
    export: function() {
      var output = "";
      return JSON.stringify(this.apps, null, 2);
      //for (var i in this.apps) {
      //  JSON.stringify(j);
      //  console.log('here');
      // }
      //return '<?php\n\n' + output + '\n\n?>';
    }
  }
}])


/*

$apps = array(
  0 => array(
    'id' => 1232132,
    'name' => 'Namdnasdada',
    'token' => '2345134535454535345',
    'user_id' => 1312312313,
    'groups'  = array(
      0 => array(
        'id' => 1231231233,
        'name' => 'Nasdmasdsad',
      ),
      2 => array(
        'id' => 34451231233,
        'name' => 'Ldsfmasdsad',
      ),
    ),
  ),
);

*/

.service('Alerts', function() {
  this.alerts = [];
  this.resetAlerts = function() {
    this.alerts.splice(0, this.alerts.length);
  };
  this.addAlert = function(alert) {
    this.alerts.push(alert);
  };
  this.delAlert = function(index) {
    this.alerts.splice(index, 1);
  }
})

.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

  $urlRouterProvider
    .otherwise("/");

  $stateProvider
    .state('apps', {
      url: '/',
      templateUrl: 'partials/list.html',
      resolve: {
        apps: ['Apps', function (Apps) {
          return Apps.load();
        }]
      },
      controller: ['$scope', 'apps', 'Alerts',
        function  ( $scope,   apps,   Alerts ) {
          $scope.apps = apps.apps;
          $scope.alerts = Alerts.alerts;
          Alerts.resetAlerts();

          $scope.closeAlert = function(index) {
            Alerts.delAlert(index);
          }

          $scope.removeApp = function (appIndex) {
            Apps.apps.splice(appIndex, 1);
            Apps.save();
          };
        }
      ]
    })
    .state('export', {
      url: '/export',
      templateUrl: 'partials/export.html',
      resolve: {
        apps: ['Apps', function (Apps) {
          return Apps.load();
        }]
      },
      controller: ['$scope', 'apps',
        function  ( $scope,   apps ) {
          $scope.code = apps.export();
          $scope.codemirrorOptions = {
            mode: 'javascript',
            json: true,
            lineNumbers: true,
            matchBrackets: true
          }
          //Apps.load().then(function () {
          //  $scope.export = Apps.export();
          //});
        }
      ]
    })
    .state('edit', {
      url: '/edit/:App',
      templateUrl: 'partials/detail.html',
      resolve: {
        apps: ['Apps', function (Apps) {
          return Apps.load();
        }]
      },
      controller: ['$scope', '$stateParams', 'apps',
        function  ( $scope,   $stateParams,   apps) {
          $scope.edit = 1;
          $scope.app = apps.apps[$stateParams.App];
        }
      ]
    })
    .state('new', {
      url: '/new',
      templateUrl: 'partials/detail.html',
      resolve: {
        apps: ['Apps', function (Apps) {
          return Apps.load();
        }]
      },
      controller: ['$scope', '$location', 'apps',
        function  ( $scope,   $location,   apps) {
          $scope.app = {};
        }]
    });
}])

.directive('saveAppButton', ['$location', '$stateParams', 'Apps', function ($location, $stateParams, Apps) {
  return {
    restrict: "A",
    link: function (scope, element, attrs) {
      var old_id = $stateParams.App ? Apps.apps[$stateParams.App].id : false;
      element.bind("click", function () {
        if ($stateParams.App) {
          if (old_id && old_id != scope.app.id) {
            delete scope.app.user_id;
            delete scope.app.token;
            delete scope.app.groups;
          }
          Apps.apps[$stateParams.App] = scope.app;
        } else {
          Apps.apps.push(scope.app);
        }
        Apps.save().then(function () {
          $location.path('/');
        });
      });
    }
  }
}])

.directive('deleteAppButton', ['$location', '$stateParams', 'Apps', function ($location, $stateParams, Apps) {
  return {
    restrict: "A",
    link: function (scope, element, attrs) {
      //var existing = $stateParams.App ? true : false;
      element.bind("click", function () {
        if ($stateParams.App) {
          Apps.apps.splice($stateParams.App, 1);
        }
        Apps.save().then(function () {
          $location.path('/');
        });
      });
    }
  }
}])

.directive('connectAppButton', ['$location', '$stateParams', 'VK', 'Apps', 'Alerts',
  function (                     $location,   $stateParams,   VK,   Apps,   Alerts) {
    return {
      restrict: "A",
      scope: {
        appIndex: '=appIndex'
      },
      link: function (scope, element, attrs) {
        element.bind("click", function () {
          var app = Apps.apps[scope.appIndex];
          Alerts.resetAlerts();
          VK.connect(app)
            .then(function (data) {
              app.token = data.token;
              app.user_id = data.user_id;
              return Apps.save();
            })
            .then(function () {
              return VK.groupsInfo(app);
            })
            .then(function (groups) {
              app.groups = groups;
              return Apps.save();
            })
            .catch(function (data) {
              Alerts.addAlert({ type: 'danger', msg: data });
              delete app.token;
              delete app.user_id;
              delete app.groups;
              Apps.save();
            });
        });
      }
    }
  }
])

