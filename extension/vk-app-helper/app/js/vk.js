"use strict";

angular.module('VKOAuth', [])

.factory('VK', ['$q', '$http', function($q, $http) {
  return {
    connect: function(app) {
      var deferred = $q.defer(),
          redirect = "https://oauth.vk.com/blank.html",
          //scopes = 'docs,offline',
          scopes = 'wall,offline,groups,photos',
          vkAuthenticationUrl  = 'https://oauth.vk.com/authorize?client_id=' + app.id + '&scope=' + scopes + '&redirect_uri=' + redirect + '&display=page&response_type=token';

      chrome.tabs.create({url: vkAuthenticationUrl, selected: true}, function (tab) {
        chrome.tabs.onUpdated.addListener((function(authenticationTabId) {
          return function tabUpdateListener(tabId, changeInfo) {

            function getUrlParameterValue(url, parameterName) {
              var urlParameters  = url.substr(url.indexOf("#") + 1),
                  parameterValue = "",
                  index,
                  temp;
              urlParameters = urlParameters.split("&");
              for (index = 0; index < urlParameters.length; index += 1) {
                temp = urlParameters[index].split("=");
                if (temp[0] === parameterName) {
                  return temp[1];
                }
              }
              return parameterValue;
            }

            function displayeAnError(textToShow, errorToShow) {
              alert(textToShow + '\n' + errorToShow);
            }

            // Function body

            var vkAccessToken,
                vkUserID,
                vkAccessTokenExpiredFlag;

            if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === "loading") {
              if (changeInfo.url.indexOf('https://oauth.vk.com/blank.html') === 0) {
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);

                vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');

                if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
                  deferred.reject('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
                  return;
                }

                vkUserID = getUrlParameterValue(changeInfo.url, 'user_id');

                vkAccessTokenExpiredFlag = Number(getUrlParameterValue(changeInfo.url, 'expires_in'));

                if (vkAccessTokenExpiredFlag !== 0) {
                  deferred.reject('vk auth response problem', 'vkAccessTokenExpiredFlag > 0');
                  return;
                }
                chrome.tabs.remove(tabId);
                deferred.resolve({ token: vkAccessToken, user_id: vkUserID });
              }
              else {
                chrome.tabs.executeScript(tabId, { file: "js/vk-error.js" }, function (data) {
                  chrome.tabs.sendMessage(tabId, {}, function (response) {
                    chrome.tabs.remove(tabId);
                    deferred.reject('Unable to authenticate application (ID:' + app.id + '): ' + response);
                  });
                });
                return;
              }
            }
          }
        })(tab.id));
      });
      return deferred.promise;
    },
    groupsInfo: function(app) {
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: 'https://api.vk.com/method/groups.get?user_id=' + app.user_id + '&extended=1&filter=admin,editor,moder&access_token=' + app.token})
        .success(function(data, status, headers, config) {
          var groups = [];
          for (var i = 0; i < data.response[0]; i++ ) {
            groups.push({ id: data.response[i + 1].gid, name: data.response[i + 1]["name"] });
          }
          return deferred.resolve(groups);
        })
        .error(function(data, status, headers, config) {
          deferred.reject(data);
        });
      return deferred.promise;
    }
  }
}]);
