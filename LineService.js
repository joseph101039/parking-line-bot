// LineService.gs
// LINE API wrapper (reply, profile, group members)
const LineService = (function () {

function _lineFetch(path, options) {
    const cfg = getConfig();
    const url = "https://api.line.me" + path;
    options = options || {};
    options.headers = Object.assign({}, options.headers || {}, {
      "Authorization": "Bearer " + cfg.CHANNEL_ACCESS_TOKEN,
      "Content-Type": "application/json"
    });
    if (options.payload && typeof options.payload !== "string") {
      options.payload = JSON.stringify(options.payload);
    }
    const resp = UrlFetchApp.fetch(url, options);
    try { return JSON.parse(resp.getContentText()); } catch (e) { return resp.getContentText(); }
  }
  
  function replyRaw(replyToken, messages) {
    const path = "/v2/bot/message/reply";
    const payload = { replyToken: replyToken, messages: messages };
    return _lineFetch(path, { method: "post", payload: payload });
  }
  
  function replyText(replyToken, text) {
    return replyRaw(replyToken, [{ type: "text", text: text }]);
  }
  
  function replyFlex(replyToken, altText, contents) {
    return replyRaw(replyToken, [{ type: "flex", altText: altText, contents: contents }]);
  }
  
  // get profile of a userId (displayName, pictureUrl, statusMessage)
  function getProfile(userId) {
    try {
      return _lineFetch(`/v2/bot/profile/${userId}`, { method: "get" });
    } catch (e) {
      console.warn("getProfile failed for", userId, e);
      return null;
    }
  }
  
  /*
    Get group/room member ids.
    If you have groupId, call /v2/bot/group/{groupId}/members/ids
    If room, use /v2/bot/room/{roomId}/members/ids
  */
  function getGroupMemberIds(groupId, isRoom) {
    try {
      const path = isRoom ? `/v2/bot/room/${groupId}/members/ids` : `/v2/bot/group/${groupId}/members/ids`;
      const res = _lineFetch(path, { method: "get" });
      // res.userIds is array
      return res && res.memberIds ? res.memberIds : (res && res.userIds ? res.userIds : []);
    } catch (e) {
      console.warn("getGroupMemberIds error", e);
      return [];
    }
  }
  
  // get many profiles (batch by ids)
  function getProfilesForIds(ids) {
    const profiles = [];
    ids.forEach(id => {
      const p = getProfile(id);
      if (p) profiles.push(p);
    });
    return profiles;
  }

  return {
    replyText,
    replyFlex,
    replyRaw,
    getProfile,
    getGroupMemberIds,
    getProfilesForIds
  };

})();