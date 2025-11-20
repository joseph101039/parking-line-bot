// ParkingService.gs
// 管理 parking sheet 的 CRUD 與查詢
class ParkingServiceClass {
  constructor() {
    this.fields = Parking.getFieldNames();
    this.keys = Object.keys(this.fields);
    this.headers = this.keys.map(key => this.fields[key]);
  }

  _getSheet() {
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(Parking.sheetName());
    if (!sheet) {
      sheet = ss.insertSheet(Parking.sheetName());
      sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
      return sheet;
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
      return sheet;
    }
    const current = sheet.getRange(1, 1, 1, this.headers.length).getValues()[0] || [];
    const mismatch = this.headers.some((label, idx) => current[idx] !== label);
    if (mismatch) {
      sheet.insertRows(1);
      sheet.getRange(1, 1, 1, this.headers.length).setValues([this.headers]);
    }
    return sheet;
  }

  getAll() {
    const sheet = this._getSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0].map(h => String(h).trim());
    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = row[idx]);
      return obj;
    });
  }

  findBySpace(spaceNumber) {
    const sheet = this._getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(spaceNumber)) {
        const map = {};
        headers.forEach((h, idx) => map[h] = data[i][idx]);
        return { rowIndex: i + 1, map: map };
      }
    }
    return null;
  }

  upsert(spaceNumber, record) {
    const sheet = this._getSheet();
    const found = this.findBySpace(spaceNumber);
    const values = this.keys.map(key => record[key] !== undefined ? record[key] : "");
    if (found) {
      sheet.getRange(found.rowIndex, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
  }
}

const ParkingService = new ParkingServiceClass();
