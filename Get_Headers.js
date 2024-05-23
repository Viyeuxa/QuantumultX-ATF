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
const requestLimit = 60; // Giới hạn số lượng yêu cầu

if (reg1.test($request.url)) {
  let url = $request.url;
  let key = url.replace(/(.*accounts\/)(.*)(\/apps)/, "$2");
  const headers = Object.keys($request.headers).reduce((t, i) => ((t[i.toLowerCase()] = $request.headers[i]), t), {});

  let session_id = headers["x-session-id"];
  let session_digest = headers["x-session-digest"];
  let request_id = headers["x-request-id"];

  // Tạo các khóa duy nhất cho mỗi yêu cầu
  let uniqueSessionIdKey = `session_id_${request_id}`;
  let uniqueSessionDigestKey = `session_digest_${request_id}`;
  let uniqueRequestIdKey = `request_id_${request_id}`;

  // Lưu trữ các giá trị với các khóa duy nhất
  $prefs.setValueForKey(session_id, uniqueSessionIdKey);
  $prefs.setValueForKey(session_digest, uniqueSessionDigestKey);
  $prefs.setValueForKey(request_id, uniqueRequestIdKey);
  $prefs.setValueForKey(key, "common_key"); // Lưu giá trị key chung

  // Lưu trữ request_id vào danh sách
  let requestList = $prefs.valueForKey("request_list");
  if (!requestList) {
    requestList = [];
  } else {
    requestList = JSON.parse(requestList);
  }
  requestList.push(request_id);
  $prefs.setValueForKey(JSON.stringify(requestList), "request_list");

  // Kiểm tra số lượng yêu cầu
  if (requestList.length >= requestLimit) {
    let commonKey = $prefs.valueForKey("common_key");
    let notificationMessage = `Key: ${commonKey}\n\nThông tin 60 yêu cầu:\n`;
    for (let i = 0; i < requestLimit; i++) {
      let reqId = requestList[i];
      notificationMessage += `Request ID: ${reqId}\n`;
      notificationMessage += `Session ID: ${$prefs.valueForKey(`session_id_${reqId}`)}\n`;
      notificationMessage += `Session Digest: ${$prefs.valueForKey(`session_digest_${reqId}`)}\n\n`;

      // Kiểm tra độ dài của thông báo, nếu vượt quá 4000 ký tự, gửi thông báo và tiếp tục
      if (notificationMessage.length > 4000) {
        $notify("Đã nhận đủ 60 yêu cầu", "", notificationMessage);
        notificationMessage = ""; // Reset thông báo
      }
    }

    // Gửi thông báo cuối cùng nếu còn nội dung
    if (notificationMessage.length > 0) {
      $notify("Đã nhận đủ 60 yêu cầu", "", notificationMessage);
    }

    // Xóa các giá trị đã lưu trữ
    for (let i = 0; i < requestLimit; i++) {
      let reqId = requestList[i];
      $prefs.removeValueForKey(`session_id_${reqId}`);
      $prefs.removeValueForKey(`session_digest_${reqId}`);
      $prefs.removeValueForKey(`request_id_${reqId}`);
    }
    $prefs.removeValueForKey("common_key");
    $prefs.removeValueForKey("request_list");
  }

  $done({});
}

function unique(arr) {
  return Array.from(new Set(arr));
}
