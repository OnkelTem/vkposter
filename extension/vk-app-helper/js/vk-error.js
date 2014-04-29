chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  try {
    var error = JSON.parse(document.body.innerText);
    sendResponse(error.error + ', ' + error.error_description);
  }
  catch (e) {
    sendResponse('Unknown error');
  }
});
