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
        Logger.log("% s: %v", action, event)  // todo remove later
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


        if (action === "queryGroupId" ) {
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
        const storedGroupId = AdminSettingService.getUserGroupId();
        const lines = [];
        lines.push("目前所在群組 ID: " + (groupId || "不在群組內"));
        lines.push("當前設置群組ID: " + (storedGroupId || "尚未設置"));
        LineService.replyText(replyToken, lines.join("\n"));
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
        const admins = [];
        const normals = [];
        const disabled = [];
        users.forEach(u => {
          if (!u.enabled) {
            disabled.push(u);
          } else if (u.is_admin) {
            admins.push(u);
          } else {
            normals.push(u);
          }
        });
        const mixed = admins.concat(normals, disabled);
        const rows = [];
        mixed.forEach((user, idx) => {
          rows.push(this._buildUserButton(user));
          if (idx !== mixed.length - 1) {
            rows.push({ type: "separator", margin: "xs" });
          }
        });
        const bubble = {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "使用者列表", weight: "bold", size: "lg" },
              { type: "text", text: "點擊使用者編輯狀態", size: "sm" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "sm",
                contents: rows
              }
            ]
          }
        };
        LineService.replyFlex(replyToken, "使用者列表", bubble);
      }

      _buildUserButton(user) {
        const isDisabled = !user.enabled;
        const isAdmin = user.enabled && user.is_admin;
        const nameColor = isDisabled ? "#999999" : (isAdmin ? "#c94542" : "#000000");
        const badgeText = isDisabled ? "X" : (isAdmin ? "管" : "-");
        const badgeColor = nameColor;
        const baseAvatarBox = {
          type: "box",
          layout: "horizontal",
          backgroundColor: "#FFFFFF",
          cornerRadius: "xxl",
          contents: [
            {
              type: "image",
              url: user.picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              size: "md",
              aspectMode: "cover",
              aspectRatio: "1:1"
            }
          ]
        };
        if (isDisabled) {
          baseAvatarBox.contents.push({
            type: "box",
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "#FFFFFFAA",
            layout: "vertical",
            contents: []
          });
        }
        return {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          backgroundColor: "#FFFFFF",
          paddingAll: "sm",
          action: { type: "postback", data: "adminSetting:selectUser:" + user.line_id },
          contents: [
            baseAvatarBox,
            {
              type: "text",
              text: user.display_name || user.line_id,
              flex: 4,
              size: "sm",
              weight: isAdmin ? "bold" : "regular",
              color: nameColor,
              wrap: false,
              align: "start",
              gravity: "center",
              offsetStart: "md"
            },
            {
              type: "text",
              text: badgeText,
              size: "md",
              color: badgeColor,
              align: "center",
              gravity: "center",
              weight: isDisabled ? "bold" : "regular"
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
                    {type: "text", text: "設置使用者群組", weight: "bold", size: "lg"},
                    {type: "text", text: "只有此群組內使用者可以使用車庫管家", size: "sm", wrap: true, margin: "md"}
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
                        action: {type: "postback", label: "查詢群組ID設置", data: "adminSetting:queryGroupId"}
                    },
                    {
                        type: "button",
                        style: "secondary",
                        action: {type: "postback", label: "設置為當前群組ID", data: "adminSetting:setGroupId"}
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
