// AdminController.gs
// 負責管理員相關功能（群組 ID 設置）
class AdminControllerClass {
  startAdminSetting(event) {
    const replyToken = event.replyToken;
    const bubble = this._buildEntryBubble();
    LineService.replyFlex(replyToken, "管理員設置", {
      type: "carousel",
      contents: [bubble]
    });
  }

  processPostback(event, data) {
    const replyToken = event.replyToken;
    const source = event.source || {};
    const groupId = source.groupId || source.roomId || null;
    if (!groupId) {
      LineService.replyText(replyToken, "請於群組內使用此功能");
      return;
    }
    const action = data.replace("adminSetting:", "");
    if (action === "queryGroupId") {
      this._handleQueryGroupId(replyToken, groupId);
      return;
    }
    if (action === "setGroupId") {
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
          { type: "text", text: "是否要設置群組ID", weight: "bold", size: "lg" },
          { type: "text", text: groupId, size: "sm", margin: "md", wrap: true }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: [
          { type: "button", style: "secondary", action: { type: "postback", label: "取消", data: "adminSetting:cancel" } },
          { type: "button", style: "primary", action: { type: "postback", label: "確定", data: "adminSetting:confirmSet:" + groupId } }
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

  _buildEntryBubble() {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "使用者群組設置", weight: "bold", size: "lg" }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "button", style: "primary", action: { type: "postback", label: "查詢當前群組ID", data: "adminSetting:queryGroupId" } },
          { type: "button", style: "secondary", action: { type: "postback", label: "設置群組ID", data: "adminSetting:setGroupId" } }
        ]
      }
    };
  }
}

const AdminController = new AdminControllerClass();

