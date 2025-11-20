// AdminController.gs
// 負責管理員相關功能（群組 ID 設置）
class AdminControllerClass {
    startAdminSetting(event) {
        const replyToken = event.replyToken;
        const contents = [
            this._buildUserListIntroBubble(),
            this._buildUserGroupEntryBubble()
        ];
        LineService.replyFlex(replyToken, "管理員設置", {
            type: "carousel",
            contents: contents
        });
    }

    processPostback(event, data) {
        const replyToken = event.replyToken;
        const source = event.source || {};
        const groupId = source.groupId || source.roomId || null;

        const action = data.replace("adminSetting:", "");
        if (action === "userList") {
            this._handleUserList(replyToken);
            return;
        }
        if (action.indexOf("selectUser:") === 0) {
            const lineId = action.split(":")[1];
            this._handleUserDetail(replyToken, lineId);
            return;
        }
        if (action.indexOf("toggleEnabled:") === 0) {
            const [_, lineId, target] = action.split(":");
            this._handleToggleEnabled(replyToken, lineId, target === "true");
            return;
        }
        if (action.indexOf("toggleAdmin:") === 0) {
            const [_, lineId, target] = action.split(":");
            this._handleToggleAdmin(replyToken, lineId, target === "true");
            return;
        }
        if (action.indexOf("deleteUser:") === 0) {
            const lineId = action.split(":")[1];
            this._confirmDeleteUser(replyToken, lineId);
            return;
        }
        if (action.indexOf("confirmDelete:") === 0) {
            const lineId = action.split(":")[1];
            this._handleDeleteUser(replyToken, lineId);
            return;
        }
        if (action.indexOf("cancelDelete") === 0) {
            LineService.replyText(replyToken, "已取消刪除");
            return;
        }


        if (action === "queryGroupId") {
            if (!groupId) {
                LineService.replyText(replyToken, "請於群組內使用此功能");
                return;
            }
            this._handleQueryGroupId(replyToken, groupId);
            return;
        }
        if (action === "setGroupId") {
            if (!groupId) {
                LineService.replyText(replyToken, "請於群組內使用此功能");
                return;
            }
            this._handleSetGroupId(replyToken, groupId);
            return;
        }
        if (action.indexOf("confirmSet:") === 0) {
            const targetId = action.split(":")[1];
            this._handleConfirmSet(replyToken, targetId);
            return;
        }
        if (action === "cancel") {
            LineService.replyText(replyToken, "已取消設置");
            return;
        }
        LineService.replyText(replyToken, "未知的管理操作");
    }

    _handleQueryGroupId(replyToken, groupId) {
        LineService.replyText(replyToken, "目前所在群組 ID: " + groupId);
    }

    _handleSetGroupId(replyToken, groupId) {
        const bubble = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "是否要設置群組ID", weight: "bold", size: "lg"},
                    {type: "text", text: groupId, size: "sm", margin: "md", wrap: true}
                ]
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                    {
                        type: "button",
                        style: "secondary",
                        action: {type: "postback", label: "取消", data: "adminSetting:cancel"}
                    },
                    {
                        type: "button",
                        style: "primary",
                        action: {type: "postback", label: "確定", data: "adminSetting:confirmSet:" + groupId}
                    }
                ]
            }
        };
        LineService.replyFlex(replyToken, "確認設置群組ID", bubble);
    }

    _handleConfirmSet(replyToken, groupId) {
        try {
            AdminSettingService.saveUserGroupId(groupId);
            LineService.replyText(replyToken, "群組 ID 已更新: " + groupId);
        } catch (err) {
            console.error("saveUserGroupId error", err);
            LineService.replyText(replyToken, "設置失敗，請稍後再試");
        }
    }

    _handleUserList(replyToken) {
        const users = UserService.getAllUsers();
        if (!users.length) {
            LineService.replyText(replyToken, "尚未同步使用者，請使用者至少傳送一則訊息。");
            return;
        }
        const rows = users.map(u => this._buildUserListRow(u));
        const bubble = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "使用者列表", weight: "bold", size: "lg"},
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "md",
                        contents: rows
                    }
                ]
            }
        };
        Logger.log(JSON.stringify(bubble));  // todo remove
        LineService.replyFlex(replyToken, "使用者列表", bubble);
    }

    _buildUserListRow(user) {
        const grayColor = user.enabled ? "#000000" : "#999999";
        return {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            // paddingAll: "8px",
            backgroundColor: user.enabled ? "#FFFFFF" : "#f0f0f0",
            action: {type: "postback", data: "adminSetting:selectUser:" + user.line_id},
            contents: [
                {
                    type: "image",
                    url: user.picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                    size: "md",
                    aspectMode: "cover",
                    aspectRatio: "1:1",
                    align: "start",
                    gravity: "center",
                    // cornerRadius: "md"
                },
                {
                    type: "text",
                    text: user.display_name || user.line_id,
                    flex: 4,
                    size: "sm",
                    weight: "bold",
                    color: grayColor,
                    wrap: true
                },
                {
                    type: "text",
                    text: user.is_admin ? "管理員" : "X",
                    size: "xs",
                    color: grayColor,
                    align: "end"
                }
            ]
        };
    }

    _handleUserDetail(replyToken, lineId) {
        const found = UserService.findUser(lineId);
        if (!found || !found.user) {
            LineService.replyText(replyToken, "找不到使用者資訊");
            return;
        }
        const user = found.user;
        const footerButtons = [];
        if (user.enabled) {
            footerButtons.push({
                type: "button",
                style: "secondary",
                action: {type: "postback", label: "停用", data: "adminSetting:toggleEnabled:" + user.line_id + ":false"}
            });
        } else {
            footerButtons.push({
                type: "button",
                style: "primary",
                action: {type: "postback", label: "啟用", data: "adminSetting:toggleEnabled:" + user.line_id + ":true"}
            });
        }
        footerButtons.push({
            type: "button",
            style: "secondary",
            action: {type: "postback", label: "刪除", data: "adminSetting:deleteUser:" + user.line_id}
        });
        if (user.is_admin) {
            footerButtons.push({
                type: "button",
                style: "secondary",
                action: {
                    type: "postback",
                    label: "移除管理員",
                    data: "adminSetting:toggleAdmin:" + user.line_id + ":false"
                }
            });
        } else {
            footerButtons.push({
                type: "button",
                style: "primary",
                action: {
                    type: "postback",
                    label: "設成管理員",
                    data: "adminSetting:toggleAdmin:" + user.line_id + ":true"
                }
            });
        }

        const bubble = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "編輯使用者", weight: "bold", size: "lg"},
                    {
                        type: "box",
                        layout: "horizontal",
                        spacing: "sm",
                        margin: "md",
                        contents: [
                            {
                                type: "image",
                                url: user.picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                                size: "md",
                                aspectMode: "cover",
                                aspectRatio: "1:1",
                                cornerRadius: "100px"
                            },
                            {
                                type: "text",
                                text: user.display_name || user.line_id,
                                size: "md",
                                weight: "bold",
                                wrap: true
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: footerButtons
            }
        };
        LineService.replyFlex(replyToken, "編輯使用者", bubble);
    }

    _handleToggleEnabled(replyToken, lineId, enabled) {
        const success = UserService.updateUser(lineId, {enabled: enabled});
        if (success) {
            LineService.replyText(replyToken, enabled ? "已啟用該使用者" : "已停用該使用者");
        } else {
            LineService.replyText(replyToken, "更新失敗");
        }
    }

    _handleToggleAdmin(replyToken, lineId, isAdmin) {
        const success = UserService.updateUser(lineId, {is_admin: isAdmin});
        if (success) {
            LineService.replyText(replyToken, isAdmin ? "已設為管理員" : "已移除管理員");
        } else {
            LineService.replyText(replyToken, "更新失敗");
        }
    }

    _confirmDeleteUser(replyToken, lineId) {
        const bubble = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "確認刪除使用者", weight: "bold", size: "lg"},
                    {type: "text", text: lineId, size: "sm", margin: "md", wrap: true}
                ]
            },
            footer: {
                type: "box",
                layout: "horizontal",
                spacing: "md",
                contents: [
                    {
                        type: "button",
                        style: "secondary",
                        action: {type: "postback", label: "取消", data: "adminSetting:cancelDelete"}
                    },
                    {
                        type: "button",
                        style: "primary",
                        action: {type: "postback", label: "確定", data: "adminSetting:confirmDelete:" + lineId}
                    }
                ]
            }
        };
        LineService.replyFlex(replyToken, "確認刪除", bubble);
    }

    _handleDeleteUser(replyToken, lineId) {
        const success = UserService.deleteUser(lineId);
        LineService.replyText(replyToken, success ? "已刪除使用者" : "刪除失敗");
    }

    _buildUserGroupEntryBubble() {
        return {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "使用者群組設置", weight: "bold", size: "lg"},
                    {type: "text", text: "將當前群組設置成取得使用者清單的群組", size: "sm", wrap: true, margin: "md"}
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        action: {type: "postback", label: "查詢當前群組ID", data: "adminSetting:queryGroupId"}
                    },
                    {
                        type: "button",
                        style: "secondary",
                        action: {type: "postback", label: "設置群組ID", data: "adminSetting:setGroupId"}
                    }
                ]
            }
        };
    }

    _buildUserListIntroBubble() {
        return {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {type: "text", text: "使用者清單", weight: "bold", size: "lg"},
                    {type: "text", text: "查看目前紀錄的使用者並進行管理", size: "sm", wrap: true, margin: "md"}
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        action: {type: "postback", label: "查詢", data: "adminSetting:userList"}
                    }
                ]
            }
        };
    }
}

const AdminController = new AdminControllerClass();
