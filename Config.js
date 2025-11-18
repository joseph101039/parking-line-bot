// Config.gs
// -----------------
// 把你的值放在 Apps Script 的 Project Properties
// 若要使用 PropertiesService：在腳本編輯器 > 檔案 > 專案屬性 > Script properties 新增 key/value

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    CHANNEL_ACCESS_TOKEN: props.getProperty("LINE_CHANNEL_ACCESS_TOKEN") || "YOUR_LINE_CHANNEL_ACCESS_TOKEN",
    // 若你要從特定 room / group 取成員，填入該 groupId/roomId
    GROUP_ROOM_ID: props.getProperty("LINE_GROUP_ID") || "xxxx",
    SHEET_NAME: props.getProperty("SHEET_NAME") || "parking",
    // Cache TTL (seconds)
    CACHE_TTL: parseInt(props.getProperty("CACHE_TTL") || "600", 10)
  };
}
