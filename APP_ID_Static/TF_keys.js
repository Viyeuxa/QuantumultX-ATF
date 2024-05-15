/*********************************
QuantumultX 添加脚本：
*********************************
QuantumultX重写引用地址：
https://raw.githubusercontent.com/chouchoui/QuanX/master/Scripts/testflight/TF_keys.js
[rewrite_local]
^https:\/\/testflight\.apple\.com\/v3\/accounts/.*\/apps$ url script-request-header https://raw.githubusercontent.com/chouchoui/QuanX/master/Scripts/testflight/TF_keys.js
[mitm]
hostname = testflight.apple.com
*********************************/

const reg1 = /^https:\/\/testflight\.apple\.com\/v3\/accounts\/(.*)\/apps$/;
// const reg2 = /^https:\/\/testflight\.apple\.com\/join\/(.*)/;

if (reg1.test($request.url)) {
  const url = $request.url;
  const key = url.replace(/(.*accounts\/)(.*)(\/apps)/, "$2");
  const headers = $request.headers;
  const session_id = headers["X-Session-Id"] || headers["x-session-id"];
  const session_digest = headers["X-Session-Digest"] || headers["x-session-digest"];
  const request_id = headers["X-Request-Id"] || headers["x-request-id"];

  $prefs.setValueForKey(key, "key");
  $prefs.setValueForKey(session_id, "session_id");
  $prefs.setValueForKey(session_digest, "session_digest");
  $prefs.setValueForKey(request_id, "request_id");

  if (request_id) {
    $notify("Tự động tham gia TF(s)", "Đã lấy thông tin", "");
  } else {
    $notify("Tự động tham gia TF(s)", "Không thể lấy thông tin", "Cần thêm testflight.apple.com");
  }
  $done({});
} 

/* else if (reg2.test($request.url)) {
  let appId = $prefs.valueForKey("APP_ID");
  if (!appId) {
    appId = "";
  }
  let arr = appId.split(",");
  const id = reg2.exec($request.url)[1];
  arr.push(id);
  arr = unique(arr).filter((a) => a);
  if (arr.length > 0) {
    appId = arr.join(",");
  }
  $prefs.setValueForKey(appId, "APP_ID");
  $notify("Tự động tham gia TF(s)", `Đã thêm APP_ID: ${id}`, `ID còn lại: ${appId}`);
  $done({});
} */

function unique(arr) {
  return Array.from(new Set(arr));
}
