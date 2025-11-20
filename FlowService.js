// FlowService.gs
// 控制 multi-step 編輯流程，暫存使用 CacheService per-user
class FlowServiceClass {
  constructor() {
    this.cfg = getConfig();
    this.totalSpaces = this._resolveTotalSpaces();
  }

  _resolveTotalSpaces() {
    const configured = parseInt(this.cfg.TOTAL_SPACES, 10);
    return isNaN(configured) ? 20 : configured;
  }

  _cacheKey(userId) { return "flow_" + userId; }
  _getCache() { return CacheService.getUserCache(); }
  getState(userId) {
    const cached = this._getCache().get(this._cacheKey(userId));
    return cached ? JSON.parse(cached) : null;
  }
  setState(userId, obj) {
    this._getCache().put(this._cacheKey(userId), JSON.stringify(obj), this.cfg.CACHE_TTL);
  }
  clearState(userId) { this._getCache().remove(this._cacheKey(userId)); }

  isUserInFlow(userId) {
    return !!this.getState(userId);
  }

  // Reply full parking list (查詢車位)
  replyParkingList(replyToken) {
    const flexContents = this.buildParkingFlexContents();
    LineService.replyFlex(replyToken, "車位清單", flexContents);
  }

  buildParkingFlexContents() {
    const slots = this._buildOrderedSlots();
    const bubbles = this._buildSlotBubbles(slots);
    if (bubbles.length === 1) return bubbles[0];
    return { type: "carousel", contents: bubbles };
  }

  _buildOrderedSlots() {
    const records = ParkingService.getAll();
    const lookup = {};
    records.forEach(rec => {
      if (rec && rec["space_number"] !== undefined && rec["space_number"] !== null) {
        lookup[String(rec["space_number"])] = rec;
      }
    });
    const slots = [];
    for (let space = 1; space <= this.totalSpaces; space++) {
      slots.push({ space: space, record: lookup[String(space)] || null });
    }
    return slots;
  }

  _buildSlotBubbles(slots) {
    const rowsPerBubble = 8;
    const bubbles = [];
    const totalPages = Math.ceil(slots.length / rowsPerBubble) || 1;
    for (let i = 0; i < slots.length; i += rowsPerBubble) {
      const chunk = slots.slice(i, i + rowsPerBubble);
      const page = Math.floor(i / rowsPerBubble) + 1;
      bubbles.push(this._buildTableBubble(chunk, page, totalPages));
    }
    return bubbles;
  }

  _buildTableBubble(chunk, page, totalPages) {
    if (!chunk.length) {
      return {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [{ type: "text", text: "沒有車位紀錄", weight: "bold", size: "lg" }]
        }
      };
    }
    const startSpace = chunk[0].space;
    const endSpace = chunk[chunk.length - 1].space;
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "車位列表", weight: "bold", size: "lg" },
          {
            type: "text",
            text: `${startSpace}-${endSpace} 號 / ${page} / ${totalPages}`,
            size: "xs",
            color: "#999999",
            margin: "sm"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "xs",
            contents: [
              this._buildTableRow(["車道", "車牌", "擁有者", "聯絡人", "電話"], true)
            ].concat(chunk.map(slot => this._buildDataRow(slot)))
          }
        ]
      }
    };
  }

  _buildDataRow(slot) {
    const record = slot.record || {};
    return this._buildTableRow([
      String(slot.space),
      record["license_plate"] || "-",
      record["owner"] || "-",
      record["contact_person"] || "-",
      record["contact_phone"] || "-"
    ], false);
  }

  _buildTableRow(cells, isHeader) {
    const flexes = [1, 2, 2, 2, 2];
    return {
      type: "box",
      layout: "baseline",
      spacing: "sm",
      backgroundColor: isHeader ? "#f2f3f4" : undefined,
      paddingAll: "4px",
      contents: cells.map((text, idx) => ({
        type: "text",
        text: text || "-",
        size: isHeader ? "xs" : "sm",
        color: isHeader ? "#666666" : "#111111",
        weight: isHeader ? "bold" : "regular",
        flex: flexes[idx] || 1,
        wrap: true
      }))
    };
  }

  // Start edit flow: ask for space number
  startEditFlow(replyToken, userId) {
    const initial = {
      step: "ask_space",
      payload: {}
    };
    this.setState(userId, initial);
    LineService.replyText(replyToken, "請輸入車道（1～" + this.totalSpaces + "）：");
  }

  // Process free text input during flow
  processFlowText(replyToken, userId, text) {
    const state = this.getState(userId);
    if (!state) {
      LineService.replyText(replyToken, "流程不存在，請輸入「編輯車位」重新開始。");
      return;
    }
    const step = state.step;

    if (step === "ask_space") {
      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1 || num > this.totalSpaces) {
        LineService.replyText(replyToken, "請輸入 1～" + this.totalSpaces + " 的數字");
        return;
      }
      state.payload.space = num;
      // check existing
      const found = ParkingService.findBySpace(num);
      if (found) {
        state.payload.original = found.map;
        state.step = "ask_new_plate_existing";
        this.setState(userId, state);
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
        this.setState(userId, state);
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
      this.setState(userId, state);
      // ask owner: give choices from group
      this.askOwnerSelection(replyToken, userId);
      return;
    }

    // owner chosen by typing (if user types custom owner instead of selecting)
    if (step === "ask_owner") {
      // accept user handwritten owner
      state.payload.owner = text;
      state.payload.owner_line_id = false;
      state.step = "ask_address_num";
      this.setState(userId, state);
      LineService.replyText(replyToken, "請輸入地址號碼（例如 8 或 10）：");
      return;
    }

    if (step === "ask_address_num") {
      state.payload.address_num = text;
      state.step = "ask_address_floor";
      this.setState(userId, state);
      LineService.replyText(replyToken, "請輸入樓層（例如 5 或 5-1）：");
      return;
    }

    if (step === "ask_address_floor") {
      state.payload.address_floor = text;
      state.step = "ask_contact_person";
      this.setState(userId, state);
      // ask contact person same as owner: offer selection
      this.askContactSelection(replyToken, userId);
      return;
    }

    if (step === "ask_contact_person") {
      state.payload.contact_person = text;
      state.step = "ask_contact_phone";
      this.setState(userId, state);
      LineService.replyText(replyToken, "請輸入聯絡電話（例如 0978xxxxxx）：");
      return;
    }

    if (step === "ask_contact_phone") {
      state.payload.contact_phone = text;
      state.step = "ask_more_contact";
      this.setState(userId, state);
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
        this.setState(userId, state);
        LineService.replyText(replyToken, "請輸入其他聯絡人姓名：");
      } else {
        // finalize save
        this.finalizeSave(replyToken, userId);
      }
      return;
    }

    // fallback
    LineService.replyText(replyToken, "輸入無法辨識，請依系統提示操作。");
  } // end processFlowText

  // handle postback data like skipPlate, cancel, selectOwner:USERID, tagOwner:USERID, selectContact:USERID
  processFlowPostback(replyToken, userId, data) {
    const state = this.getState(userId);
    // universal cancel
    if (data === "cancel") {
      this.clearState(userId);
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
      this.setState(userId, state);
      this.askOwnerSelection(replyToken, userId);
      return;
    }

    // selectOwner:{userId}
    if (data.indexOf("selectOwner:") === 0) {
      state.payload.owner = data.split(":" )[1];
      state.payload.owner_line_id = true;
      state.step = "ask_address_num";
      this.setState(userId, state);
      LineService.replyText(replyToken, "請輸入地址號碼（例如 8 或 10）：");
      return;
    }

    // selectContact:{userId}
    if (data.indexOf("selectContact:") === 0) {
      state.payload.contact_person = data.split(":" )[1];
      // treat contact person from LINE id as owner_line_id? we'll mark contact as line id if selected
      state.payload.contact_is_line = true;
      state.step = "ask_contact_phone";
      this.setState(userId, state);
      LineService.replyText(replyToken, "請輸入聯絡電話（例如 0978xxxxxx）：");
      return;
    }

    // tagOwner: used when clicking avatar in list
    if (data.indexOf("tagOwner:") === 0) {
      const ownerId = data.split(":" )[1];
      const p = LineService.getProfile(ownerId);
      const name = (p && p.displayName) ? p.displayName : ownerId;
      LineService.replyText(replyToken, "嘗試標註：" + name);
    }
  }

  askOwnerSelection(replyToken) {
    const groupId = this.cfg.GROUP_ROOM_ID;
    if (!groupId) {
      LineService.replyText(replyToken, "無法取得群組設定，請直接輸入擁有者名稱。");
      return;
    }
    const ids = LineService.getGroupMemberIds(groupId, /*isRoom=*/false);
    const actions = ids.slice(0, 10).map(id => {
      const p = LineService.getProfile(id);
      const label = p && p.displayName ? p.displayName : (id || "user");
      return {
        type: "button",
        action: { type: "postback", label: label, data: "selectOwner:" + id }
      };
    });
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

  askContactSelection(replyToken) {
    const groupId = this.cfg.GROUP_ROOM_ID;
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
  finalizeSave(replyToken, userId) {
    const state = this.getState(userId);
    if (!state || !state.payload) {
      LineService.replyText(replyToken, "流程資料遺失，請重新操作。");
      this.clearState(userId);
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
      ParkingService.upsert(p.space, record);
      LineService.replyText(replyToken, "儲存資料，儲存成功 ✅");
      this.clearState(userId);
    } catch (e) {
      console.error("save error", e);
      LineService.replyText(replyToken, "儲存失敗，請稍後再試。");
    }
  }
}

const FlowService = new FlowServiceClass();
