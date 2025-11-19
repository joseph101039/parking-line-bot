// AdminSettingService.gs
// 操作 admin_setting sheet，確保存在並可儲存管理設定
class AdminSettingServiceClass {
  constructor() {
    this.columns = ["key", "value", "annotation"];
  }

  ensureSheet() {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(AdminSetting.sheetName());
    if (!sheet) {
      sheet = ss.insertSheet(AdminSetting.sheetName());
      this._seedHeaders(sheet);
      return sheet;
    }
    if (sheet.getLastRow() === 0) {
      this._seedHeaders(sheet);
      return sheet;
    }
    const existingHeader = sheet.getRange(1, 1, 1, this.columns.length).getValues()[0];
    const desiredHeader = this._headerLabels();
    const isHeaderMissing = existingHeader.some((val, idx) => String(val || "") !== desiredHeader[idx]);
    if (isHeaderMissing) {
      sheet.insertRows(1);
      sheet.getRange(1, 1, 1, desiredHeader.length).setValues([desiredHeader]);
    }
    return sheet;
  }

  saveUserGroupId(groupId) {
    const setting = AdminSetting.setUserGroupId(groupId);
    this.upsert(setting);
  }

  upsert(setting) {
    const sheet = this.ensureSheet();
    const values = sheet.getDataRange().getValues();
    const rowData = this.columns.map(col => setting[col] || "");
    if (values.length > 1) {
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === setting.key) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          return;
        }
      }
    }
    sheet.appendRow(rowData);
  }

  getSetting(key) {
    const sheet = this.ensureSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        const obj = {};
        this.columns.forEach((col, idx) => obj[col] = data[i][idx] || "");
        return new AdminSetting(obj);
      }
    }
    return null;
  }

  _headerLabels() {
    const names = AdminSetting.getFieldNames();
    return this.columns.map(col => names[col] || col);
  }

  _seedHeaders(sheet) {
    const headers = this._headerLabels();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

const AdminSettingService = new AdminSettingServiceClass();

