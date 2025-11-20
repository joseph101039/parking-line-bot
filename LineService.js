// LineService.gs
// LINE API wrapper (reply, profile, group members)
class LineServiceClass {
    _lineFetch(path, options) {
        const cfg = getConfig();
        const url = "https://api.line.me" + path;
        const opts = Object.assign({}, options);
        opts.headers = Object.assign({}, opts.headers || {}, {
            "Authorization": "Bearer " + cfg.CHANNEL_ACCESS_TOKEN,
            "Content-Type": "application/json"
        });
        if (opts.payload && typeof opts.payload !== "string") {
            opts.payload = JSON.stringify(opts.payload);
        }
        const resp = UrlFetchApp.fetch(url, opts);
        try {
            return JSON.parse(resp.getContentText());
        } catch (e) {
            return resp.getContentText();
        }
    }

    replyRaw(replyToken, messages) {
        const path = "/v2/bot/message/reply";
        const payload = {replyToken: replyToken, messages: messages};
        return this._lineFetch(path, {method: "post", payload: payload});
    }

    replyText(replyToken, text) {
        return this.replyRaw(replyToken, [{type: "text", text: text}]);
    }

    replyFlex(replyToken, altText, contents) {
        return this.replyRaw(replyToken, [{type: "flex", altText: altText, contents: contents}]);
    }

    // API: https://developers.line.biz/en/reference/messaging-api/#get-profile
    getProfile(userId) {
        try {
            return this._lineFetch(`/v2/bot/profile/${userId}`, {method: "get"});
        } catch (e) {
            console.warn("getProfile failed for", userId, e);
            return null;
        }
    }

    getGroupMemberIds(groupId, isRoom) {
        try {
            const path = isRoom ? `/v2/bot/room/${groupId}/members/ids` : `/v2/bot/group/${groupId}/members/ids`;
            const res = this._lineFetch(path, {method: "get"});
            return res && res.memberIds ? res.memberIds : (res && res.userIds ? res.userIds : []);
        } catch (e) {
            console.warn("getGroupMemberIds error", e);
            return [];
        }
    }

    getAllGroupMemberIds(groupId, isRoom) {
        const ids = [];
        let start = null;
        do {
            const path = isRoom ? `/v2/bot/room/${groupId}/members/ids` : `/v2/bot/group/${groupId}/members/ids`;
            const fullPath = start ? `${path}?start=${encodeURIComponent(start)}` : path;
            const res = this._lineFetch(fullPath, {method: "get"});
            if (res && res.memberIds && res.memberIds.length) {
                ids.push(...res.memberIds);
                start = res.next || null;
            } else {
                start = null;
            }
        } while (start);
        return ids;
    }

    getGroupMemberProfile(groupId, userId, isRoom) {
        try {
            const base = isRoom ? `/v2/bot/room/${groupId}/member/${userId}` : `/v2/bot/group/${groupId}/member/${userId}`;
            return this._lineFetch(base, {method: "get"});
        } catch (e) {
            console.warn("getGroupMemberProfile error", groupId, userId, e);
            return null;
        }
    }

    getProfilesForIds(ids) {
        const profiles = [];
        ids.forEach(id => {
            const p = this.getProfile(id);
            if (p) profiles.push(p);
        });
        return profiles;
    }
}

const LineService = new LineServiceClass();
