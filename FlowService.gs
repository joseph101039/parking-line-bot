// FlowService.gs
// 控制 multi-step 編輯流程，暫存使用 CacheService per-user
const FlowService = (function () {
  const cfg = getConfig();

  function _cacheKey(userId) { return "flow_" + userId; }
  function _getCache() {
    return CacheService.getUserCache();
  }
  function getState(userId) {
    const cached = _getCache().get(_cacheKey(userId));
    return cached ? JSON.parse(cached) : null;
  }
  function setState(userId, obj) {
    _getCache().put(_cacheKey(userId), JSON.stringify(obj), cfg.CACHE_TTL);
  }
  function clearState(userId) {
    _getCache().remove(_cacheKey(userId));
  }

  function isUserInFlow(userId) {
    return !!getState(userId);
  }

  // Reply full parking list (查詢車位)
  function replyParkingList(replyToken) {
    const records = getAllRecordsSafe();
    // build Flex bubble list
    const bubbles = records.map(rec => buildParkingBubble(rec));
    const flex = {
      type: "carousel",
      contents: bubbles.length ? bubbles : [{
        type: "bubble",
        body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "沒有車位紀錄" }] }
      }]
    };
    LineService.replyFlex(replyToken, "車位清單", flex);
  }

  function getAllRecordsSafe() {
    try {
      return SheetService.getAllRecords();
    } catch (e) {
      console.error("getAllRecords error", e);
      return [];
    }
  }

  function buildParkingBubble(rec) {
    // rec keys: space_number, license_plate, owner, address_num, address_floor, contact_person, contact_phone, enabled, owner_line_id
    const ownerIsLine = (String(rec["owner_line_id"]).toLowerCase() === "true" || rec["owner_line_id"] === true);
    const heroImage = ownerIsLine ? (function () {
      try {
        const prof = LineService.getProfile(String(rec["owner"]));
        if (prof && prof.pictureUrl) return prof.pictureUrl;
      } catch (e) { }
      return null;
    })() : null;

    const ownerContent = ownerIsLine && heroImage ? {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "image",
          url: heroImage,
          size: "xxs",
          aspectMode: "cover",
          action: {
            type: "postback",
            label: "tag",
            data: "tagOwner:" + String(rec["owner"])
          }
        },
        { type: "text", text: String(rec["owner"] || ""), size: "xs", wrap: true }
      ],
      spacing: "sm",
      width: "120px"
    } : {
      type: "text",
      text: String(rec["owner"] || ""),
      size: "sm",
      wrap: true,
      flex: 2
    };

    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "車道 " + String(rec["space_number"]), weight: "bold", size: "lg" },
          { type: "text", text: "車牌：" + String(rec["license_plate"] || ""), size: "sm" },
          { type: "text", text: "地址：" + (rec["address_num"] || "") + " / " + (rec["address_floor"] || ""), size: "sm" },
          { type: "box", layout: "baseline", contents: [{ type: "text", text: "聯絡：" + (rec["contact_person"] || ""), size: "sm" }], spacing: "sm" },
          ownerContent
        ]
      }
    };
  }

  // Start edit flow: ask for space number
  function startEditFlow(replyToken, userId) {
    const initial = {
      step: "ask_space",
      payload: {}
    };
    setState(userId, initial);
    LineService.replyText(replyToken, "請輸入車道（1～20）：");
  }

  // Process free text input during flow
  function processFlowText(replyToken, userId, text) {
    const state = getState(userId);
    if (!state) {
      LineService.replyText(replyToken, "流程不存在，請輸入「編輯車位」重新開始。");
      return;
    }
    const step = state.step;

    if (step === "ask_space") {
      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1 || num > 20) {
        LineService.replyText(replyToken, "請輸入 1～20 的數字");
        return;
      }
      state.payload.space = num;
      // check existing
      const found = SheetService.findRowBySpace(num);
      if (found) {
        state.payload.original = found.map;
        state.step = "ask_new_plate_existing";
        setState(userId, state);
        // present original plate + buttons: 略過 / 取消
        const flex = {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "原本車號：" + (found.map["license_plate"] || ""), size: "md", weight: "bold" },
              { type: "text", text: "請輸入新車號（或按略過保留原車號）", size: "sm", wrap: true }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "button", action: { type: "postback", label: "略過", data: "skipPlate" } },
              { type: "button", action: { type: "postback", label: "取消", data: "cancel" } }
            ]
          }
        };
        LineService.replyFlex(replyToken, "編輯車位 - 車牌", flex);
      } else {
        state.step = "ask_new_plate_new";
        setState(userId, state);
        const flex = {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "此車道為新車位，請輸入車號（格式：ABC-1234）", size: "sm" }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "button", action: { type: "postback", label: "取消", data: "cancel" } }
            ]
          }
        };
        LineService.replyFlex(replyToken, "新增車位 - 車牌", flex);
      }
      return;
    }

    // handle new plate input (either existing or new)
    if (step === "ask_new_plate_existing" || step === "ask_new_plate_new") {
      const plateNormalized = normalizePlate(text);
      if (!validatePlate(plateNormalized)) {
        LineService.replyText(replyToken, '請輸入「三碼英文-四碼數字」，例如「ABC-1234」');
        return;
      }
      state.payload.license_plate = plateNormalized;
      state.step = "ask_owner";
      setState(userId, state);
      // ask owner: give choices from group
      askOwnerSelection(replyToken, userId);
      return;
    }

    // owner chosen by typing (if user types custom owner instead of selecting)
    if (step === "ask_owner") {
      // accept user handwritten owner
      state.payload.owner = text;
      state.payload.owner_line_id = false;
      state.step = "ask_address_num";
      setState(userId, state);
      LineService.replyText(replyToken, "請輸入地址號碼（例如 8 或 10）：");
      return;
    }

    if (step === "ask_address_num") {
      state.payload.address_num = text;
      state.step = "ask_address_floor";
      setState(userId, state);
      LineService.replyText(replyToken, "請輸入樓層（例如 5 或 5-1）：");
      return;
    }

    if (step === "ask_address_floor") {
      state.payload.address_floor = text;
      state.step = "ask_contact_person";
      setState(userId, state);
      // ask contact person same as owner: offer selection
      askContactSelection(replyToken, userId);
      return;
    }

    if (step === "ask_contact_person") {
      state.payload.contact_person = text;
      state.step = "ask_contact_phone";
      setState(userId, state);
      LineService.replyText(replyToken, "請輸入聯絡電話（例如 0978xxxxxx）：");
      return;
    }

    if (step === "ask_contact_phone") {
      state.payload.contact_phone = text;
      state.step = "ask_more_contact";
      setState(userId, state);
      LineService.replyText(replyToken, "是否要新增其他聯絡人？回覆「是」或「否」");
      return;
    }

    if (step === "ask_more_contact") {
      const v = text.trim();
      if (v === "是") {
        // go back to ask_contact_person (allow adding another)
        state.step = "ask_contact_person";
        // we append contact as additional by storing array
        state.payload.additional_contacts = state.payload.additional_contacts || [];
        setState(userId, state);
        LineService.replyText(replyToken, "請輸入其他聯絡人姓名：");
      } else {
        // finalize save
        finalizeSave(replyToken, userId);
      }
      return;
    }

    // fallback
    LineService.replyText(replyToken, "輸入無法辨識，請依系統提示操作。");
  } // end processFlowText

  // handle postback data like skipPlate, cancel, selectOwner:USERID, tagOwner:USERID, selectContact:USERID
  function processFlowPostback(replyToken, userId, data) {
    const state = getState(userId);
    // universal cancel
    if (data === "cancel") {
      clearState(userId);
      LineService.replyText(replyToken, "本次操作沒有任何異動");
      return;
    }
    if (!state) {
      // maybe this postback is tagging from query list: tagOwner:USERID
      if (data && data.indexOf("tagOwner:") === 0) {
        const ownerId = data.split(":")[1];
        try {
          const p = LineService.getProfile(ownerId);
          const name = (p && p.displayName) ? p.displayName : ownerId;
          // Try to send a mention-like reply (best-effort)
          LineService.replyText(replyToken, "標註：" + name);
        } catch (e) {
          LineService.replyText(replyToken, "標註操作失敗");
        }
      } else {
        LineService.replyText(replyToken, "流程已過期或不存在，請重新開始（輸入「編輯車位」）");
      }
      return;
    }

    // skipPlate
    if (data === "skipPlate") {
      // copy original plate
      if (state.payload && state.payload.original && state.payload.original["license_plate"]) {
        state.payload.license_plate = state.payload.original["license_plate"];
      }
      state.step = "ask_owner";
      setState(userId, state);
      askOwnerSelection(replyToken, userId);
      return;
    }

    // selectOwner:{userId}
    if (data.indexOf("selectOwner:") === 0) {
      const sel = data.split(":")[1];
      // set owner as that userId and mark owner_line_id true
      state.payload.owner = sel;
      state.payload.owner_line_id = true;
      state.step = "ask_address_num";
      setState(userId, state);
      LineService.replyText(replyToken, "請輸入地址號碼（例如 8 或 10）：");
      return;
    }

    // selectContact:{userId}
    if (data.indexOf("selectContact:") === 0) {
      const sel = data.split(":")[1];
      state.payload.contact_person = sel;
      // treat contact person from LINE id as owner_line_id? we'll mark contact as line id if selected
      state.payload.contact_is_line = true;
      state.step = "ask_contact_phone";
      setState(userId, state);
      LineService.replyText(replyToken, "請輸入聯絡電話（例如 0978xxxxxx）：");
      return;
    }

    // tagOwner: used when clicking avatar in list
    if (data.indexOf("tagOwner:") === 0) {
      const ownerId = data.split(":")[1];
      const p = LineService.getProfile(ownerId);
      const name = (p && p.displayName) ? p.displayName : ownerId;
      LineService.replyText(replyToken, "嘗試標註：" + name);
      return;
    }
  }

  // ask owner selection by fetching group members
  function askOwnerSelection(replyToken, userId) {
    const cfg = getConfig();
    // try to fetch members of configured GROUP_ROOM_ID
    const groupId = cfg.GROUP_ROOM_ID;
    if (!groupId) {
      LineService.replyText(replyToken, "無法取得群組設定，請直接輸入擁有者名稱。");
      return;
    }
    const ids = LineService.getGroupMemberIds(groupId, /*isRoom=*/false);
    // build quick selection Flex (最多 10 顯示)
    const actions = ids.slice(0, 10).map(id => {
      const p = LineService.getProfile(id);
      const label = p && p.displayName ? p.displayName : (id || "user");
      return {
        type: "button",
        action: { type: "postback", label: label, data: "selectOwner:" + id }
      };
    });
    // also allow entering custom name
    const contents = {
      type: "bubble",
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "請選擇擁有者（或輸入其他人名）", weight: "bold" },
          { type: "text", text: "點選下列人名或直接輸入", size: "sm" }
        ]
      },
      footer: { type: "box", layout: "vertical", contents: actions.concat([{ type: "button", action: { type: "postback", label: "取消", data: "cancel" } }]) }
    };
    LineService.replyFlex(replyToken, "選擇擁有者", { type: "carousel", contents: [contents] });
  }

  function askContactSelection(replyToken, userId) {
    // similar to owner selection but postback data selectContact
    const cfg = getConfig();
    const groupId = cfg.GROUP_ROOM_ID;
    if (!groupId) {
      LineService.replyText(replyToken, "無法取得群組設定，請直接輸入聯絡人姓名。");
      return;
    }
    const ids = LineService.getGroupMemberIds(groupId, /*isRoom=*/false);
    const actions = ids.slice(0, 10).map(id => {
      const p = LineService.getProfile(id);
      const label = p && p.displayName ? p.displayName : (id || "user");
      return {
        type: "button",
        action: { type: "postback", label: label, data: "selectContact:" + id }
      };
    });
    const contents = {
      type: "bubble",
      body: {
        type: "box", layout: "vertical",
        contents: [
          { type: "text", text: "請選擇聯絡人（或輸入其他人名）", weight: "bold" },
          { type: "text", text: "點選下列人名或直接輸入", size: "sm" }
        ]
      },
      footer: { type: "box", layout: "vertical", contents: actions.concat([{ type: "button", action: { type: "postback", label: "取消", data: "cancel" } }]) }
    };
    LineService.replyFlex(replyToken, "選擇聯絡人", { type: "carousel", contents: [contents] });
  }

  // finalize and save to sheet
  function finalizeSave(replyToken, userId) {
    const state = getState(userId);
    if (!state || !state.payload) {
      LineService.replyText(replyToken, "流程資料遺失，請重新操作。");
      clearState(userId);
      return;
    }
    const p = state.payload;
    const record = {};
    // build record with header names same as sheet
    record["space_number"] = p.space;
    record["license_plate"] = p.license_plate || (p.original && p.original["license_plate"]) || "";
    record["owner"] = p.owner || (p.original && p.original["owner"]) || "";
    record["address_num"] = p.address_num || (p.original && p.original["address_num"]) || "";
    record["address_floor"] = p.address_floor || (p.original && p.original["address_floor"]) || "";
    record["contact_person"] = p.contact_person || (p.original && p.original["contact_person"]) || "";
    record["contact_phone"] = p.contact_phone || (p.original && p.original["contact_phone"]) || "";
    record["enabled"] = true;
    record["owner_line_id"] = !!p.owner_line_id;

    try {
      SheetService.appendOrUpdateRecord(p.space, record);
      LineService.replyText(replyToken, "儲存資料，儲存成功 ✅");
      clearState(userId);
    } catch (e) {
      console.error("save error", e);
      LineService.replyText(replyToken, "儲存失敗，請稍後再試。");
    }
  }

  return {
    replyParkingList: replyParkingList,
    startEditFlow: startEditFlow,
    processFlowText: processFlowText,
    processFlowPostback: processFlowPostback,
    isUserInFlow: isUserInFlow
  };
})();
