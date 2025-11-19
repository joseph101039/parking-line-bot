
// 撈取 user 清單來源的群組 ID, 只應有一列
class AdminSetting {
    constructor(data) {
        this.key = data.key || "";  // primary key
        this.value = data.value || "";
        this.annotation = data.annotation || "";
    }

    // 欄位對應中文名稱
    static getFieldNames() {
        return {
            key: "設定名稱",
            value: "設定值",
            annotation: "註解",
        };
    }

    static sheetName() {
        return "admin_setting";
    }

    static primaryKey() {
        return "key";
    }

    static setUserGroupId(groupId) {
        return new AdminSetting({key: "user_group_id", value: groupId, annotation: "取得 user 來源的群組 ID"});
    }

}
