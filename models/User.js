
// 主群組內的使用者名單
class User {
    constructor(data) {
        this.line_id = data.line_id || "";
        this.display_name = data.display_name || "";
        this.picture_url = data.picture_url || "";
        this.enabled = data.enabled || true;
        this.is_admin = data.is_admin === true || data.is_admin === "TRUE";
    }

    // 欄位對應中文名稱
    static getFieldNames() {
        return {
            line_id: "LINE ID",
            display_name: "顯示名稱",
            picture_url: "大頭貼",
            enabled: "啟用",
            is_admin: "是否為管理員",
        };
    }

    static sheetName() {
        return "user";
    }

    static primaryKey() {
        return "line_id";
    }

}
