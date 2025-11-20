
# 部署步驟

1. Terminal 輸入, 將程式推送到 Google Apps Script
    ```
   clasp push
   ```

2. 在 [Google Apps Script Editor](https://script.google.com/home/projects/1I-uW3RuCpT23gny7k9vp1LxuoF32yb6qFgQqCr0F2gvvTD1GwoJ6B9WZ) 裡面，手動執行 `部署` 按鈕， 新增部署作業部署，產生一串  `網頁應用程式`


3. 將產生的 `網頁應用程式` URL 貼到 [Line Developers Console - Message API](https://developers.line.biz/console/channel/2008463874/messaging-api) 裡面的 `Webhook URL` 欄位
   


# 除錯

1. 查詢 [GCP Log](https://console.cloud.google.com/logs/query?authuser=1&hl=zh-TW&project=graphic-armor-478414-p7)

2. 如果是訊息格式錯誤 log 出訊息再貼到 [Flex message simulator](https://developers.line.biz/flex-simulator/) 測試

# 程式與設置

## Google Sheets (Database)

https://docs.google.com/spreadsheets/d/1xZq_M2-6JI0V4YRbM-CxsTGZYrFN5ip66jR9DMTIKV8/edit?usp=sharing

## Line Developers Console

https://developers.line.biz/console/channel/2008463874



## Line Official Account 主頁

https://manager.line.biz/account/@687ptsgi/

- line bot 需要開通官方帳號才能使用

## Log Explorer

https://console.cloud.google.com/logs/query?authuser=1&hl=zh-TW&project=graphic-armor-478414-p7

- 查看 Google Apps Script logs

## Google Apps Script Editor

https://script.google.com/home/projects/1I-uW3RuCpT23gny7k9vp1LxuoF32yb6qFgQqCr0F2gvvTD1GwoJ6B9WZ/projecthistory



# 教學文件

## How to use clasp 

https://codelabs.developers.google.com/codelabs/clasp?hl=zh-tw#0

- 用以上傳 Google Apps Script 專案


## APP Script 文件

https://developers.google.com/apps-script/guides/logging?hl=zh-tw
