/*
id	contact_person	contact_phone
13	邱政瑋	0978241900	TRUE
1	Joseph	1111	TRUE	FALSE
 */

class Parking {
    constructor(data) {
        this.space_number = data.space_number || "";  // primary key
        this.license_plate = data.license_plate || "";
        this.owner = data.owner || "";
        this.owner_line_id = data.owner_line_id || "";
        this.address_num = data.address_num || "";
        this.address_floor = data.address_floor || "";
        this.enabled = data.enabled === true || data.enabled === "TRUE";
        this.contact_id = data.contact_id || 0; // foreign key: Contact.id

    }
    // 欄位對應中文名稱
    static getFieldNames() {
        return {
            space_number: "車道",
            license_plate: "車牌號碼",
            owner: "車位所有人",
            owner_line_id: "車位所有人LINE ID",
            address_num: "地址門牌",
            address_floor: "地址樓層",
            enabled: "是否啟用",
        };
    }

    static sheetName() {
        return "parking";
    }

    static primaryKey() {
        return "space_number";
    }

}
