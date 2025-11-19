
// 車位對應的多組聯絡人
class Contact {
    constructor(data) {
        this.id = data.id || 0;
        this.contact_person = data.contact_person || "";
        this.contact_phone = data.contact_phone || "";
        this.contact_line_id = data.contact_line_id || "";

    }
    // 欄位對應中文名稱
    static getFieldNames() {
        return {
            id: "編號",
            contact_person: "聯絡人",
            contact_phone: "車牌號碼",
            contact_line_id: "聯絡人 LINE ID"
        };
    }

    static sheetName() {
        return "contact";
    }
    static primaryKey() {
        return "id";
    }



}
