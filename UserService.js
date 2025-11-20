// UserService.gs
// 管理 user sheet 的增刪查改
class UserServiceClass {
  constructor() {
    const fields = User.getFieldNames();
    this.fieldKeys = Object.keys(fields);
    this.headers = this.fieldKeys.map(key => fields[key]);
  }

  ensureSheet() {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(User.sheetName());
    if (!sheet) {
      sheet = ss.insertSheet(User.sheetName());
      sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
      return sheet;
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, this.headers.length).getValues()[0] || [];
      const mismatch = this.headers.some((label, idx) => currentHeaders[idx] !== label);
      if (mismatch) {
        sheet.clearContents();
        sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
      }
    }
    return sheet;
  }

  upsertFromLine(userId) {
    if (!userId) return;
    const prof = LineService.getProfile(userId) || {};
    this.upsertUser({
      line_id: userId,
      display_name: prof.displayName || "",
      picture_url: prof.pictureUrl || "",
      enabled: true
    });
  }

  upsertUser(data) {
    if (!data || !data.line_id) return;
    const sheet = this.ensureSheet();
    const rowIndex = this._findRowIndex(sheet, data.line_id);
    const rowValues = this.fieldKeys.map(key => {
      if (key === "enabled") return data.enabled !== undefined ? data.enabled : true;
      if (key === "display_name") return data.display_name || "";
      if (key === "picture_url") return data.picture_url || "";
      if (key === "is_admin") return data.is_admin !== undefined ? data.is_admin : false;
      return data[key] !== undefined ? data[key] : "";
    });
    if (rowIndex !== null) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  }

  disableUser(lineId) {
    this.upsertUser({ line_id: lineId, enabled: false });
  }

  getAllUsers() {
    const sheet = this.ensureSheet();
    const totalRows = sheet.getLastRow();
    if (totalRows < 2) return [];
    const values = sheet.getRange(2, 1, totalRows - 1, this.fieldKeys.length).getValues();
    return values.map(row => this._rowToUser(row)).filter(Boolean);
  }

  findUser(lineId) {
    if (!lineId) return null;
    const sheet = this.ensureSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === lineId) {
        return { rowIndex: i + 1, user: this._rowToUser(data[i].slice(0, this.fieldKeys.length)) };
      }
    }
    return null;
  }

  updateUser(lineId, updates) {
    if (!lineId) return false;
    const sheet = this.ensureSheet();
    const found = this.findUser(lineId);
    if (!found) return false;
    const current = Object.assign({}, found.user, updates || {});
    const rowValues = this.fieldKeys.map(key => current[key] !== undefined ? current[key] : "");
    sheet.getRange(found.rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return true;
  }

  deleteUser(lineId) {
    if (!lineId) return false;
    const sheet = this.ensureSheet();
    const found = this.findUser(lineId);
    if (!found) return false;
    sheet.deleteRow(found.rowIndex);
    return true;
  }

  _findRowIndex(sheet, lineId) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === lineId) {
        return i + 1;
      }
    }
    return null;
  }

  _rowToUser(row) {
    if (!row || !row[0]) return null;
    const user = {};
    this.fieldKeys.forEach((key, idx) => {
      user[key] = row[idx];
    });
    user.enabled = user.enabled === true || user.enabled === "TRUE";
    user.is_admin = user.is_admin === true || user.is_admin === "TRUE";
    return user;
  }


  trackUserFromEvent(ev) {
    const groupId = (ev.source && (ev.source.groupId || ev.source.roomId)) || null;
    const targetGroupId = AdminSettingService.getUserGroupId();
    if (!groupId || !targetGroupId || groupId !== targetGroupId) {
      if (!groupId && ev.type === "message" && ev.source && ev.source.userId) {
        this.upsertFromLine(ev.source.userId);
      }
      return;
    }

    if (ev.type === "memberJoined" && ev.joined && ev.joined.members) {
      ev.joined.members.forEach(member => {
        if (member && member.userId) {
          this.upsertFromLine(member.userId);
        }
      });
      return;
    }

    if (ev.type === "memberLeft" && ev.left && ev.left.members) {
      ev.left.members.forEach(member => {
        if (member && member.userId) {
          this.disableUser(member.userId);
        }
      });
      return;
    }

    const userId = ev.source && ev.source.userId;
    if (!userId) return;
    this.upsertFromLine(userId);
  }
}

const UserService = new UserServiceClass();
