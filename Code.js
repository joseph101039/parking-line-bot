// Code.gs
// 入口：doPost - 接收 LINE webhook
function doPost(e) {
    // Logger.log(e); // logging all requests
    try {
        const payload = JSON.parse(e.postData.contents);
        const events = payload.events || [];
        events.forEach(ev => {
          try {
            UserService.trackUserFromEvent(ev);
             if (ev.type === "message" && ev.message.type === "text") {
               handleTextEvent(ev);
             } else if (ev.type === "postback") {
               handlePostbackEvent(ev);
             } else {
               // 可擴充處理 join/leave 等事件
             }
           } catch (innerErr) {
                Logger.log(innerErr);
                console.error("handle event error:", innerErr);
            }
        });
    } catch (err) {
        Logger.log(err);
        console.error("doPost parse error:", err);
    }
    return ContentService.createTextOutput(JSON.stringify({status: "ok"})).setMimeType(ContentService.MimeType.JSON);
}

// 文字訊息分流
function handleTextEvent(ev) {
    const text = ev.message.text.trim();
    const replyToken = ev.replyToken;
    const userId = (ev.source && (ev.source.userId || ev.source.userId === "")) ? ev.source.userId : null;

    if (text === "查詢車位") {
        FlowService.replyParkingList(replyToken);
        return;
    }
    if (text === "編輯車位") {
        FlowService.startEditFlow(replyToken, userId);
        return;
    }

    if (text === "管理員設置") {
        AdminController.startAdminSetting(ev);
        return;
    }

    // 若使用者正在流程中，交給流程處理
    if (FlowService.isUserInFlow(userId)) {
        FlowService.processFlowText(replyToken, userId, text);
        return;
    }

    // 非預期文字：提示
    const isGroupContext = ev.source && (ev.source.groupId || ev.source.roomId);
    if (!isGroupContext) {
        LineService.replyText(replyToken, "請輸入「查詢車位」或「編輯車位」開始。");
    }
 }

 // postback event
 function handlePostbackEvent(ev) {
   const userId = ev.source.userId;
   const data = ev.postback && ev.postback.data ? ev.postback.data : "";
   if (data && data.indexOf("adminSetting:") === 0) {
     AdminController.processPostback(ev, data);
     return;
   }
   FlowService.processFlowPostback(ev.replyToken, userId, data);
 }
