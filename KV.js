export default {
  async fetch(request, env) {
    const response = await handleRequest(request, env);
    return response;
  },

  async scheduled(event, env) {
    event.waitUntil(handleScheduled(env));
  }
};

async function handleRequest(request, env) {
  const response = await processTestFlight(env.autotestflight, env);
  return response;
}

async function handleScheduled(env) {
  const response = await processTestFlight(env.autotestflight, env);
  return response;
}

async function processTestFlight(db, env) {
  try {
    const telegramBotToken = await getKV(env, 'telegramBotToken3');
    if (!telegramBotToken) {
      throw new Error('telegramBotToken not found in KV storage');
    }

    const currentTime = Date.now();

    // Truy vấn tất cả các tài khoản TestFlight và APP_IDs liên quan
    const { results: tfAccs } = await db.prepare(`
      SELECT 
        testflightaccs.*, 
        app_ids.app_id, 
        app_ids.app_name
      FROM 
        testflightaccs
      LEFT JOIN 
        app_ids ON testflightaccs.id = app_ids.tf_acc_id
    `).all();

    if (!tfAccs || tfAccs.length === 0) {
      console.log("Danh sách app_id là rỗng, cần thêm dữ liệu mới.");
      return new Response("Danh sách app_id là rỗng, cần thêm dữ liệu mới.", { status: 200 });
    }

    // Tính toán số lượng headers cần thiết
    const numAppIds = tfAccs.filter(acc => acc.app_id).length;

    // Truy vấn tất cả các headers phù hợp với số lượng cần thiết
    const { results: headers } = await db.prepare(`
      SELECT 
        headers.id AS header_id,
        headers.tf_acc_id,
        headers.request_id, 
        headers.session_digest, 
        headers.session_id, 
        headers.lastUsed
      FROM 
        headers
      WHERE 
        lastUsed IS NULL OR (? - lastUsed) > 6 * 60 * 1000
      ORDER BY 
        lastUsed ASC
      LIMIT ?
    `).bind(currentTime, numAppIds).all();

    if (!headers || headers.length === 0) {
      console.log("Danh sách headers là rỗng, cần thêm dữ liệu mới.");
      return new Response("Danh sách headers là rỗng, cần thêm dữ liệu mới.", { status: 200 });
    }

    let successMessages = {};
    let hasSuccess = false; // Biến cờ để kiểm tra xem có ứng dụng nào tham gia thành công không
    let pendingAppIds = tfAccs.map(acc => ({
      tfAccId: acc.id,
      appId: acc.app_id,
      appName: acc.app_name,
      key: acc.key,
      chatId: acc.chat_id,
      tfAccName: acc.name
    }));

    while (pendingAppIds.length > 0) {
      let newPendingAppIds = [];
      let appIdsToRemove = [];
      let usedHeaderIds = new Set();

      for (let i = 0; i < pendingAppIds.length; i++) {
        const app = pendingAppIds[i];
        const header = headers.find(h => h.tf_acc_id === app.tfAccId && (h.lastUsed === null || (currentTime - h.lastUsed) > 6 * 60 * 1000));

        if (!header) {
          console.log(`Không tìm thấy header phù hợp cho appId ${app.appId}`);
          newPendingAppIds.push(app);
          continue;
        }

        const result = await autoPost(app.appId, app.appName, app.key, header.session_id, header.session_digest, header.request_id, telegramBotToken, app.chatId, app.tfAccName);
        // Ghi log kết quả của autoPost
        console.log(`Kết quả của autoPost cho APP_ID ${app.appId} (${app.appName}): ${result.status}`);
        
        if (result && result.status) {
          if (result.status === 'Thành công') {
            if (!successMessages[app.chatId]) {
              successMessages[app.chatId] = `*THÔNG BÁO!*\n\n*TestFlightAcc ${app.tfAccName}*\n*Các ứng dụng đã tham gia thành công:*\n`;
            }
            successMessages[app.chatId] += `${result.name} (${app.appId})\n`;
            appIdsToRemove.push(app); // Đánh dấu app_id cần loại bỏ
            hasSuccess = true;
            usedHeaderIds.add(header.header_id);
            header.lastUsed = currentTime; // Cập nhật lastUsed trực tiếp trong danh sách headers
          } else if (result.status === 'Không tồn tại') {
            appIdsToRemove.push(app); 
            usedHeaderIds.add(header.header_id);
            header.lastUsed = currentTime; // Cập nhật lastUsed trực tiếp trong danh sách headers
          } else if (result.status === 'Đầy') {
            usedHeaderIds.add(header.header_id);
            header.lastUsed = currentTime; // Cập nhật lastUsed trực tiếp trong danh sách headers
          } else if (result.status === 'Header đã dùng') {
            newPendingAppIds.push(app);
            console.log(`APP_ID ${app.appId} đã được thêm vào danh sách chờ lấy Header mới !`);
          }
        } else {
          console.log(`Lỗi: Kết quả không hợp lệ cho APP_ID ${app.appId} (${app.appName}).`);
        }
      }

      if (usedHeaderIds.size > 0) {
        await db.prepare(`
          UPDATE headers 
          SET lastUsed = ? 
          WHERE id IN (${[...usedHeaderIds].join(',')})
        `).bind(currentTime).run();
      }

      if (appIdsToRemove.length > 0) {
        for (const app of appIdsToRemove) {
          await db.prepare(`
            DELETE FROM app_ids 
            WHERE app_id = ? AND tf_acc_id = ?
          `).bind(app.appId, app.tfAccId).run();
        }
      }

      // Truy vấn lại để lấy các headers mới cho các app_id chưa được xử lý
      if (newPendingAppIds.length > 0) {
        const tfAccIds = [...new Set(newPendingAppIds.map(app => app.tfAccId))];
        let newHeaders = [];

        for (const tfAccId of tfAccIds) {
          const count = newPendingAppIds.filter(app => app.tfAccId === tfAccId).length;
          const { results: headersForTfAcc } = await db.prepare(`
            SELECT 
              headers.id AS header_id,
              headers.tf_acc_id,
              headers.request_id, 
              headers.session_digest, 
              headers.session_id, 
              headers.lastUsed
            FROM 
              headers
            WHERE 
              tf_acc_id = ?
              AND (lastUsed IS NULL OR (? - lastUsed) > 6 * 60 * 1000)
            ORDER BY 
              lastUsed ASC
            LIMIT ?
          `).bind(tfAccId, currentTime, count).all();

          newHeaders = newHeaders.concat(headersForTfAcc);
        }

        // Tạo map để lưu headers theo tf_acc_id
        const tfAccIdHeadersMap = newHeaders.reduce((acc, header) => {
          if (!acc[header.tf_acc_id]) {
            acc[header.tf_acc_id] = [];
          }
          acc[header.tf_acc_id].push(header);
          return acc;
        }, {});

        // Kết hợp lại các newPendingAppIds với các headers phù hợp
        newPendingAppIds = newPendingAppIds.map(app => {
          const headersForTfAcc = tfAccIdHeadersMap[app.tfAccId] || [];
          if (headersForTfAcc.length > 0) {
            const header = headersForTfAcc.shift();
            return {
              ...app,
              headerId: header.header_id,
              requestId: header.request_id,
              sessionDigest: header.session_digest,
              sessionId: header.session_id,
              lastUsed: header.lastUsed
            };
          }
          return app;
        }).filter(app => app.headerId);  // Lọc ra các app không tìm được header phù hợp
      }

      pendingAppIds = newPendingAppIds;
    }

    // Gửi tin nhắn cho từng chatId
    if (hasSuccess) {
      for (const chatId in successMessages) {
        await sendTelegramMessage(successMessages[chatId], telegramBotToken, chatId);
      }
    }

    return new Response("Process completed", { status: 200 });

  } catch (error) {
    console.log(`Lỗi: ${error.message}`);
    return new Response(`Lỗi: ${error.message}`, { status: 500 });
  }
}

async function autoPost(appId, appName, key, session_id, session_digest, request_id, telegramBotToken, chatId, tfAccName) {
  const testurl = `https://testflight.apple.com/v3/accounts/${key}/ru/`;
  const header = {
    "X-Session-Id": session_id,
    "X-Session-Digest": session_digest,
    "X-Request-Id": request_id,
    "User-Agent": 'Oasis/3.5.1 OasisBuild/425.2 iOS/17.5 model/iPhone12,1 hwp/t8030 build/21F79 (6; dt:203) AMS/1 TSE/0'
  };

  try {
    const acceptResponse = await fetch(testurl + appId + "/accept", { method: 'POST', headers: header });

    if (acceptResponse.status === 200) {
      const acceptData = await acceptResponse.json();
      const successMessage = `Ứng dụng ${acceptData.data.name} (${appId}) của TestFlightAcc ${tfAccName} đã tham gia thành công!`;
      console.log(successMessage);
      return { appId, status: 'Thành công', name: acceptData.data.name };
    } else if (acceptResponse.status === 409 || acceptResponse.status === 429) {
      return { appId, status: 'Đầy', message: 'Ứng dụng đầy' };
    } else if (acceptResponse.status === 401) {
      return { appId, status: 'Header đã dùng', message: 'Đổi header' };
    } else if (acceptResponse.status === 404) {
      const message = `APP_ID ${appId} (${appName}) của TestFlightAcc ${tfAccName} không tồn tại và đã được xóa khỏi danh sách chờ.`;
      console.log(message);
      return { appId, status: 'Không tồn tại', message: 'Hãy xoá APP_ID đó' };
    } else {
      console.log(`Lỗi không xác định khi xử lý APP_ID ${appId} (${appName}): ${acceptResponse.status}`);
      return { appId, status: 'Lỗi', message: `Lỗi không xác định: ${acceptResponse.status}` };
    }
  } catch (error) {
    console.log(`Lỗi khi xử lý ${appId}: ${error.message}`);
    return { appId, status: 'Lỗi', message: error.message };
  }
}

// Hàm lấy giá trị từ KV Storage
async function getKV(env, key) {
  try {
    const value = await env.AutoTestFlight.get(key);
    return value;
  } catch (error) {
    console.error(`Lỗi trong getKV cho key ${key}:`, error);
    throw new Error(`Không thể lấy giá trị cho key ${key}`);
  }
}

// Hàm gửi thông báo tới Telegram
async function sendTelegramMessage(message, telegramBotToken, chatId) {
  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error("Phản hồi lỗi từ Telegram:", responseData);
      throw new Error(`Không thể gửi tin nhắn tới Telegram: ${responseData.description}`);
    } else {
      console.log("Gửi tin nhắn thành công tới Telegram:", responseData);
    }
  } catch (error) {
    console.error("Lỗi trong sendTelegramMessage:", error);
    throw new Error(`Không thể gửi tin nhắn tới Telegram: ${error.message}`);
  }
}
