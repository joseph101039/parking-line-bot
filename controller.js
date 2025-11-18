// const LINE_TOKEN = 'GsDrN0IBif2B68pnujBtimghlGYOLOpp8GCFeRhHpf9Yzuw83lhuk6kZvZov74kmOYATfTlQXgSd09S4u0i/mVkG53iFh4Stid9eQYpH9Zl+vpG+PgI2fTIAVaWGfygN70Ps7MV/4kcQLTU3t7W6RgdB04t89/1O/w1cDnyilFU='; // 從 LINE Developer 拿到
// const SHEET_NAME = 'parking'; // 你的 Sheet 名稱

// // webhook event: https://developers.line.biz/en/reference/messaging-api/#message-event
// function doPost(e) {
//   try {
//     Logger.log(e); // logging all requests
//     const data = JSON.parse(e.postData.contents);
//     const events = data.events;
//     for (let i = 0; i < events.length; i++) {
//       const event = events[i];
//       const userMessage = event.message.text;
//       const replyToken = event.replyToken;

//       // 查詢 Google Sheet
//       const replyText = searchSheet(userMessage);

//       // 回傳訊息給 LINE
//       replyToLine(replyToken, replyText);
//     }
//   } catch (error) {
//     Logger.log(error);
//   }
// }

// // 查詢 Sheet
// function searchSheet(keyword) {
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
//   const data = sheet.getDataRange().getValues();
//   for (let i = 1; i < data.length; i++) {
//     if (data[i][0] == keyword) {
//       return data[i][1];
//     }
//   }
//   return '查無此資料 😅';
// }

// // 回覆 LINE
// function replyToLine(replyToken, text) {
//   const url = 'https://api.line.me/v2/bot/message/reply';
//   const payload = {
//     replyToken: replyToken,
//     messages: [{ type: 'text', text: text }],
//   };

//   const params = {
//     method: 'post',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': 'Bearer ' + LINE_TOKEN,
//     },
//     payload: JSON.stringify(payload),
//   };

//   UrlFetchApp.fetch(url, params);
// }
