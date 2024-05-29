const reg1 = /^https:\/\/testflight\.apple\.com\/v(2|3)\/accounts\/(.*)\/apps(.*)$/;
const requestLimit = 20; // Giới hạn số lượng yêu cầu
const maxMessageLength = 4000; // Giới hạn ký tự cho mỗi thông báo

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

  // Nếu đây là yêu cầu đầu tiên, gửi thông báo /addtfacc
  if (requestList.length === 0) {
    let commonKey = $prefs.valueForKey("common_key");
    $notify("/addtfacc", "", "/addtfacc " + "username " + commonKey);
  }

  requestList.push(request_id);
  $prefs.setValueForKey(JSON.stringify(requestList), "request_list");

  // Kiểm tra số lượng yêu cầu
  if (requestList.length >= requestLimit) {
    let commonKey = $prefs.valueForKey("common_key");
    let notificationHeader = `/addheaders\nKey: ${commonKey}\n\n`;
    let notificationMessage = notificationHeader;
    for (let i = 0; i < requestLimit; i++) {
      let reqId = requestList[i];
      let requestInfo = `Request ID: ${reqId}\n`;
      requestInfo += `Session ID: ${$prefs.valueForKey(`session_id_${reqId}`)}\n`;
      requestInfo += `Session Digest: ${$prefs.valueForKey(`session_digest_${reqId}`)}\n\n`;

      // Kiểm tra độ dài của thông báo, nếu vượt quá giới hạn, gửi thông báo và tiếp tục
      if ((notificationMessage + requestInfo).length > maxMessageLength) {
        $notify("Đã nhận đủ 20 yêu cầu", "", notificationMessage);
        notificationMessage = notificationHeader; // Reset thông báo với phần header cố định
      }

      notificationMessage += requestInfo;
    }

    // Gửi thông báo cuối cùng nếu còn nội dung
    if (notificationMessage.length > notificationHeader.length) {
      $notify("Đã nhận đủ 20 yêu cầu", "", notificationMessage);
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
