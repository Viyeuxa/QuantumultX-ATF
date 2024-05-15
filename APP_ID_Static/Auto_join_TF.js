//*********************************
// */10 * * * * https://raw.githubusercontent.com/Viyeuxa/QuantumultX-ATF/main/APP_ID_Static/Auto_join_TF.js, tag=TestFlight自动加入, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/testflight.png, enabled=true
//*********************************

!(async () => {
  const githubUrl = "https://raw.githubusercontent.com/Viyeuxa/QuantumultX-ATF/main/APP_ID_Static/APP_ID_List.txt";
  try {
    const response = await fetch(githubUrl);
    if (!response.ok) throw new Error("Không thể tải danh sách APP_ID từ GitHub");
    
    let ids = await response.text();
    if (ids.trim() === "") {
      $notify("Danh sách APP_ID là rỗng", "Cần thêm APP_ID mới nhé", "");
      $done();
      return;
    }

    ids = ids.split('\n').map(id => id.trim()).filter(id => id !== "");
    if (ids.length === 0) {
      $notify("Danh sách APP_ID là rỗng", "Cần thêm APP_ID mới nhé", "");
      $done();
      return;
    }

    try {
      for (const ID of ids) {
        await autoPost(ID);
      }
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    $notify("Lỗi khi tải danh sách APP_ID", error.message, "");
  }
  $done();
})();

function autoPost(ID) {
  const Key = $prefs.valueForKey("key");
  const testurl = "https://testflight.apple.com/v3/accounts/" + Key + "/ru/";
  const header = {
    "X-Session-Id": `${$prefs.valueForKey("session_id")}`,
    "X-Session-Digest": `${$prefs.valueForKey("session_digest")}`,
    "X-Request-Id": `${$prefs.valueForKey("request_id")}`,
  };
  return new Promise((resolve) => {
    $task.fetch({ url: testurl + ID, method: "GET", headers: header }).then(
      (resp) => {
        const { body: data } = resp;
        if (resp.status === 404) {
          console.log(ID + " " + "không tồn tại hãy xoá APP_ID đó");
          $notify(ID, "TF không tồn tại", "hãy xoá APP_ID đó");
          resolve();
        } else {
          let jsonData = JSON.parse(data);
          if (jsonData.data == null) {
            console.log(ID + " " + jsonData.messages[0].message);
            resolve();
          } else if (jsonData.data.status === "FULL") {
            console.log(ID+"("+jsonBody.data.name+")" + " " + jsonData.data.message);
            resolve();
          } else {
            $task.fetch({ url: testurl + ID + "/accept", method: "POST", headers: header }).then((res) => {
              const { body } = res;
              let jsonBody = JSON.parse(body);
              $notify(jsonBody.data.name, "đã tham gia thành công", "");
              console.log(jsonBody.data.name + " đã tham gia thành công");
              resolve();
            });
          }
        }
      },
      (error) => {
        if (error === "The request timed out.") {
          resolve();
        } else {
          $notify("Tự động tham gia TF: ", error, "");
          console.log(ID + " " + error);
          resolve();
        }
      }
    );
  });
}
