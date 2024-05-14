/******************************************
 * @name Giám sát TestFlight
 * @description Chỉ tương thích với các công cụ khác ngoài Surge, người dùng Surge vui lòng sử dụng tập lệnh gốc
 * @channel https://t.me/yqc_123/
 * @feedback https://t.me/yqc_777/
 * @update 20240320
 * @version 1.0.0
 *****************************************
 Tập lệnh gốc: https://raw.githubusercontent.com/githubdulong/Script/master/Auto_join_TF.js
 Tác giả gốc: @MuTu888
*****************************************
 Cấu hình QuantumultX:
[mimt]
hostname = testflight.apple.com

[rewrite_local]
^https:\/\/testflight\.apple\.com\/(v3\/accounts\/.*[^\/accept]|join\/[A-Za-z0-9]+)$ url script-request-header https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js

[task_local]
0/5 * * * * * https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js, tag=TF Giám sát tự động tham gia, img-url=https://raw.githubusercontent.com/githubdulong/Script/master/Images/testflight.png, enabled=true
******************************************
 Cấu hình Loon:
[MITM]
hostname = testflight.apple.com

[Script]
http-request ^https:\/\/testflight\.apple\.com\/(v3\/accounts\/.*[^\/accept]|join\/[A-Za-z0-9]+)$ tag=Lấy tham số TF, script-path=https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js
cron "0/5 * * * * *" script-path=https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js, timeout=10, tag=TF Giám sát tự động tham gia, img-url=https://raw.githubusercontent.com/githubdulong/Script/master/Images/testflight.png
******************************************
 Cấu hình Surge:
[MITM]
hostname = %APPEND% testflight.apple.com

[Script]
Lấy tham số TF = type=http-request,pattern=^https:\/\/testflight\.apple\.com\/(v3\/accounts\/.*[^\/accept]|join\/[A-Za-z0-9]+)$,requires-body=0,max-size=0,timeout=1000,script-path=https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js,script-update-interval=0
TF Giám sát tự động tham gia = type=cron,cronexp="0/5 * * * * *",wake-system=1,script-path=https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/AutoJoinTF.js,timeout=60
******************************************/
const $ = new Env('TF tự động tham gia')
$.isRequest = () => 'undefined' != typeof $request
const [
    // ----------
    // Tham số TF
    Key,
    SessionId,
    SessionDigest,
    RequestId,
    // ----------
    // Tham số ứng dụng
    APP_ID_Str,
    // ----------
    // Tham số cấu hình
    LOON_COUNT = 1, // Mỗi lần thực thi lặp lại bao nhiêu lần, mặc định là 1
    INTERVAL = 0 // Thời gian chờ, đơn vị: giây, mặc định là 0
] = ['tf_key', 'tf_session_id', 'tf_session_digest', 'tf_request_id', 'tf_app_ids', 'tf_loon_count', 'tf_interval'].map((key) => $.getdata(key))
var APP_IDS = APP_ID_Str ? APP_ID_Str.split(',') : []
const baseURL = `https://testflight.apple.com/v3/accounts/${Key}/ru/`
const headers = {
    'X-Session-Id': SessionId,
    'X-Session-Digest': SessionDigest,
    'X-Request-Id': RequestId
}
const inArray = (value, array = APP_IDS, separator = '#') => array.findIndex((item) => item.split(separator)[0] === value)
// Lấy tham số
const getParams = () => {
    const { url, headers: header } = $request
    const handler = (appId) => {
        const status = '0' // 0: Chưa tham gia | 1: Đã tham gia
        const CACHE_APP_ID = `${appId}#${status}`
        if (!APP_IDS.includes(CACHE_APP_ID)) {
            APP_IDS.push(CACHE_APP_ID)
            $.setdata(APP_IDS.join(','), 'tf_app_ids')
            $.msg($.name, 'Lấy tham số ứng dụng thành công', `Đã bắt và lưu ID ứng dụng: ${appId}`)
        } else {
            $.msg($.name, '', `ID ứng dụng: ${appId} đã tồn tại, không cần thêm lại.`)
        }
    }
    // Mở TF APP để lấy tham số thông tin
    if (/^https:\/\/testflight\.apple\.com\/v3\/accounts\/.*\/apps$/.test(url)) {
        const headers = Object.fromEntries(Object.entries(header).map(([key, value]) => [key.toLowerCase(), value]))
        const session_id = headers['x-session-id']
        const session_digest = headers['x-session-digest']
        const request_id = headers['x-request-id']
        const key = /\/accounts\/(.*?)\/apps/.exec(url)?.[1] || null
        $.setdata(session_id, 'tf_session_id')
        $.setdata(session_digest, 'tf_session_digest')
        $.setdata(request_id, 'tf_request_id')
        $.setdata(key, 'tf_key')
        const encrypt = (str) => str.slice(0, 4) + '***********'
        $.msg($.name, 'Lấy tham số TF thành công', `session_id: ${encrypt(session_id)}\nsession_digest: ${encrypt(session_digest)}\nrequest_id: ${encrypt(request_id)}\nkey: ${encrypt(key)}`)
    }
    // Mở liên kết để lấy tham số
    else if (/^https:\/\/testflight\.apple\.com\/join\/([A-Za-z0-9]+)$/.test(url)) {
        const appIdMatch = url.match(/^https:\/\/testflight\.apple\.com\/join\/([A-Za-z0-9]+)$/)
        if (appIdMatch && appIdMatch[1]) {
            let appId = appIdMatch[1]
            handler(appId)
        } else {
            $.log('Không bắt được ID APP TestFlight hợp lệ')
        }
    } else if (/v3\/accounts\/.*\/ru/.test(url)) {
        const reg = /v3\/accounts\/.*\/ru\/(.*[^\/accept])/
        const appId = reg.exec(url)[1]
        handler(appId)
    }
}
// Kiểm tra ứng dụng TF
const TF_Check = (app_id) => {
    return new Promise((resolve, reject) => {
        $.get({ url: baseURL + app_id, headers }, (error, response, data) => {
            if (error) {
                return reject(`${app_id} Yêu cầu mạng thất bại: ${error}`)
            }
            if (response.status !== 200) {
                APP_IDS.splice(inArray(app_id), 1)
                $.setdata(APP_IDS.join(','), 'tf_app_ids')
                $.msg('Không phải là liên kết TestFlight hợp lệ', '', `${app_id} đã bị loại bỏ`)
                return reject(`${app_id} Không phải là liên kết hợp lệ: Trạng thái mã ${response.status}, loại bỏ APP_ID`)
            }
            const appData = $.toObj(data)
            if (!appData) {
                return reject(`${app_id} Phân tích dữ liệu thất bại: ${data}`)
            }
            resolve(appData)
        })
    })
}
// Tham gia ứng dụng TF
const TF_Join = (app_id) => {
    return new Promise((resolve, reject) => {
        $.post(
            {
                url: baseURL + app_id + '/accept',
                headers
            },
            (error, response, data) => {
                if (!error && response.status === 200) {
                    const jsonBody = $.toObj(data)
                    if (!jsonBody) {
                        return reject(`${app_id} Yêu cầu tham gia phản hồi phân tích thất bại: ${data}`)
                    }
                    resolve(jsonBody)
                } else {
                    reject(`${app_id} Tham gia thất bại: ${error || `Trạng thái mã ${response.status}`}`)
                }
            }
        )
    })
}
// Hàm thực thi ngay lập tức
;(async () => {
    if ($.isRequest()) return getParams()
    if (!Key || !SessionId || !SessionDigest || !RequestId) return $.msg('Thiếu tham số', 'Vui lòng lấy tham số trước')
    const noJoinExists = APP_IDS.some((app_id) => app_id.split('#')[1] === '0')
    if (!noJoinExists) return $.log('Không có APP_ID nào cần tham gia')
    for (let app_id of APP_IDS) {
        const [appId, status] = app_id.split('#')
        if (status === '0') {
            for (let i = 0; i < LOON_COUNT; i++) {
                INTERVAL && (await $.wait(INTERVAL * 1000))
                try {
                    const appData = await TF_Check(appId)
                    if (!appData?.data) $.log(`${appId} Không thể chấp nhận lời mời, tiếp tục thực thi`)
                    if (appData.data?.status === 'OPEN') {
                        $.log(`${appId}(${appData.data.app.name})`, `Mở để tham gia, đang tham gia...`)
                        const jsonBody = await TF_Join(appId)
                        $.log(`🎉Tham gia thành công`)
                        $.msg(`${jsonBody.data.name}`, 'TestFlight tham gia thành công')
                        APP_IDS[APP_IDS.indexOf(app_id)] = `${app_id.replace('#0', '#1')}`
                        $.setdata(APP_IDS.join(','), 'tf_app_ids')
                        break
                    } else {
                        $.log(`${appId}(${appData.data.app.name})`, `${appData.data.message}`)
                    }
                } catch (err) {
                    $.log(err)
                    break
                }
            }
            $.log('================================')
            $.log(appId + ' thực thi hoàn tất')
            $.log('================================')
        } else {
            $.log(`${appId} Đã tham gia, bỏ qua`)
            $.log('================================')
        }
    }
})()
    .catch((e) => $.log('', `❗️${$.name}, Lỗi!`, e))
    .finally(() => $.done({}))
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise(((e,r)=>{s.call(this,t,((t,s,a)=>{t?r(t):e(s)}))}))}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, Bắt đầu!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,r)=>e(r)))}))}runScript(t,e){return new Promise((s=>{let r=this.getdata("@chavy_boxjs_userCfgs.httpapi");r=r?r.replace(/\n/g,"").trim():r;let a=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");a=a?1*a:20,a=e&&e.timeout?e.timeout:a;const[i,o]=r.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:a},headers:{"X-Key":i,Accept:"*/*"},timeout:a};this.post(n,((t,e,r)=>s(r)))})).catch((t=>this.logErr(t)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),r=!s&&this.fs.existsSync(e);if(!s&&!r)return{};{const r=s?t:e;try{return JSON.parse(this.fs.readFileSync(r))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),r=!s&&this.fs.existsSync(e),a=JSON.stringify(this.data);s?this.fs.writeFileSync(t,a):r?this.fs.writeFileSync(e,a):this.fs.writeFileSync(t,a)}}lodash_get(t,e,s=void 0){const r=e.replace(/\[(\d+)\]/g,".$1").split(".");let a=t;for(const t of r)if(a=Object(a)[t],void 0===a)return s;return a}lodash_set(t,e,s){return Object(t)!==t||(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce(((t,s,r)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[r+1])>>0==+e[r+1]?[]:{}),t)[e[e.length-1]]=s),t}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,r]=/^@(.*?)\.(.*?)$/.exec(t),a=s?this.getval(s):"";if(a)try{const t=JSON.parse(a);e=t?this.lodash_get(t,r,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,r,a]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(r),o=r?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,a,t),s=this.setval(JSON.stringify(e),r)}catch(e){const i={};this.lodash_set(i,a,t),s=this.setval(JSON.stringify(i),r)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,((t,s,r)=>{!t&&s&&(s.body=r,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,r)}));break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:r,headers:a,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:r,headers:a,body:i,bodyBytes:o},i,o)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",((t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}})).then((t=>{const{statusCode:r,statusCode:a,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:r,statusCode:a,headers:i,rawBody:o,body:n},n)}),(t=>{const{message:r,response:a}=t;e(r,a,a&&s.decode(a.rawBody,this.encoding))}))}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,((t,s,r)=>{!t&&s&&(s.body=r,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,r)}));break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:r,headers:a,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:r,headers:a,body:i,bodyBytes:o},i,o)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let r=require("iconv-lite");this.initGotEnv(t);const{url:a,...i}=t;this.got[s](a,i).then((t=>{const{statusCode:s,statusCode:a,headers:i,rawBody:o}=t,n=r.decode(o,this.encoding);e(null,{status:s,statusCode:a,headers:i,rawBody:o,body:n},n)}),(t=>{const{message:s,response:a}=t;e(s,a,a&&r.decode(a.rawBody,this.encoding))}))}}time(t,e=null){const s=e?new Date(e):new Date;let r={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in r)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?r[e]:("00"+r[e]).substr((""+r[e]).length)));return t}queryStr(t){let e="";for(const s in t){let r=t[s];null!=r&&""!==r&&("object"==typeof r&&(r=JSON.stringify(r)),e+=`${s}=${r}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",r="",a){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:return{url:t.url||t.openUrl||t["open-url"]};case"Loon":return{openUrl:t.openUrl||t.url||t["open-url"],mediaUrl:t.mediaUrl||t["media-url"]};case"Quantumult X":return{"open-url":t["open-url"]||t.url||t.openUrl,"media-url":t["media-url"]||t.mediaUrl,"update-pasteboard":t["update-pasteboard"]||t.updatePasteboard};case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,r,i(a));break;case"Quantumult X":$notify(e,s,r,i(a));case"Node.js":}if(!this.isMuteLog){let t=["","==============📣Thông báo hệ thống📣=============="];t.push(e),s&&t.push(s),r&&t.push(r),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, Lỗi!`,t);break;case"Node.js":this.log("",`❗️${this.name}, Lỗi!`,t.stack)}}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, Kết thúc! 🕛 ${e} giây`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)

