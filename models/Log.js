
class Log {
    constructor(data) {
        this.time = data.time || new Date().toISOString();
        this.action = data.action || "";
        this.before = data.before || "";
        this.after = data.after || "";
    }

    static sheetName() {
        return "log";
    }

    static primaryKey() {
        return "";
    }

}
