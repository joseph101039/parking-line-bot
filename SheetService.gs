// SheetService.gs
// 操作 Google Sheet: assume header row exists with columns:
// space_number, license_plate, owner, address_num, address_floor, contact_person, contact_phone, enabled, owner_line_id
const SheetService = (function () {

function _getSheet() {
    const cfg = getConfig();
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(cfg.SHEET_NAME);
    if (!sheet) throw new Error("No sheet named " + cfg.SHEET_NAME);
    return sheet;
  }

  function getAllRecords() {
    const sheet = _getSheet();
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

  function findRowBySpace(spaceNumber) {
    const sheet = _getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const val = row[0];
      if (String(val) === String(spaceNumber)) {
        // return object with rowIndex and values map
        const map = {};
        headers.forEach((h, idx) => map[String(h).trim()] = row[idx]);
        return { rowIndex: i + 1, map: map }; // sheet row index 1-based
      }
    }
    return null;
  }

  function appendOrUpdateRecord(spaceNumber, record) {
    const sheet = _getSheet();
    const found = findRowBySpace(spaceNumber);
    const headers = sheet.getDataRange().getValues()[0];
    const values = headers.map(h => record[h] !== undefined ? record[h] : "");
    if (found) {
      sheet.getRange(found.rowIndex, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
  }

  return {
    getAllRecords,
    findRowBySpace,
    appendOrUpdateRecord
  }
})();
