// SheetService.gs
// 操作 Google Sheet: assume header row exists with columns:
// space_number, license_plate, owner, address_num, address_floor, contact_person, contact_phone, enabled, owner_line_id
class SheetServiceClass {
  constructor() {
    this.cfg = getConfig();
  }

  _getSheet() {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(this.cfg.SHEET_NAME);
    if (!sheet) throw new Error("No sheet named " + this.cfg.SHEET_NAME);
    return sheet;
  }

  getAllRecords() {
    const sheet = this._getSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    return rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  }

  findRowBySpace(spaceNumber) {
    const sheet = this._getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const val = row[0];
      if (String(val) === String(spaceNumber)) {
        const map = {};
        headers.forEach((h, idx) => map[String(h).trim()] = row[idx]);
        return { rowIndex: i + 1, map: map };
      }
    }
    return null;
  }

  appendOrUpdateRecord(spaceNumber, record) {
    const sheet = this._getSheet();
    const found = this.findRowBySpace(spaceNumber);
    const headers = sheet.getDataRange().getValues()[0];
    const values = headers.map(h => record[h] !== undefined ? record[h] : "");
    if (found) {
      sheet.getRange(found.rowIndex, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
  }
}

const SheetService = new SheetServiceClass();
