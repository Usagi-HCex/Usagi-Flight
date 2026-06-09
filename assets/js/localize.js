(() => {
  const STORAGE_KEY = "flight-log-language";
  const LEGACY_STORAGE_KEY = "azurex-flight-language";
  const DEFAULT_LANGUAGE = "en";
  const ATTRIBUTES = ["placeholder", "aria-label", "title"];

  const languages = {
    en: {
      htmlLang: "en",
      label: "EN",
      nativeName: "English",
      switcherLabel: "Language"
    },
    zh: {
      htmlLang: "zh-CN",
      label: "中",
      nativeName: "简体中文",
      switcherLabel: "语言",
      exact: {
        "Dashboard - Personal Flight Log Management System": "控制台 - 个人飞行日志管理系统",
        "Flight Records - Personal Flight Log Management System": "航班记录 - 个人飞行日志管理系统",
        "Add Flight Record - Personal Flight Log Management System": "新增航班记录 - 个人飞行日志管理系统",
        "Edit Flight Record - Personal Flight Log Management System": "编辑航班记录 - 个人飞行日志管理系统",
        "View Flight Record - Personal Flight Log Management System": "查看航班记录 - 个人飞行日志管理系统",
        "Flight Route Map - Personal Flight Log Management System": "航线地图 - 个人飞行日志管理系统",
        "Mobile Dashboard - Personal Flight Log Management System": "移动控制台 - 个人飞行日志管理系统",
        "Mobile Flights List - Personal Flight Log Management System": "移动航班列表 - 个人飞行日志管理系统",
        "Mobile Map - Personal Flight Log Management System": "移动地图 - 个人飞行日志管理系统",
        "Mobile Add Flight - Personal Flight Log Management System": "移动新增航班 - 个人飞行日志管理系统",
        "Mobile Edit Flight - Personal Flight Log Management System": "移动编辑航班 - 个人飞行日志管理系统",
        "Mobile Flight Detail - Personal Flight Log Management System": "移动航班详情 - 个人飞行日志管理系统",
        "Flight Log Dashboard": "控制台",
        "Personal Flight Log Management System": "个人飞行日志管理系统",
        "Manage encrypted flight records, review route histories, export CSV data, and visualize great-circle flight maps using a static OurAirports coordinate index.": "管理加密航班记录、查看航线历史、导出 CSV 数据，并使用静态 OurAirports 坐标索引可视化大圆航线地图。",
        "System Information": "系统信息",
        "System Version": "系统版本",
        "Cache Status": "缓存状态",
        "Cache Revision": "缓存版本",
        "Current Time": "当前时间",
        "Add Flight Record": "新增航班记录",
        "Register flight number, aircraft model, route, terminals, local date and time, baggage information, and remarks.": "登记航班号、机型、航线、航站楼、本地日期时间、行李信息和备注。",
        "NEW ENTRY": "新增记录",
        "Show Flight Records": "查看航班记录",
        "Browse encrypted flight records through the cached paginated table.": "通过缓存分页表格浏览加密航班记录。",
        "CACHED VIEW": "缓存视图",
        "Flight Route Map": "航线地图",
        "View all recorded flights as great-circle routes, filter by date range, zoom, fullscreen, and export the map as PNG.": "以大圆航线查看全部记录，可按日期范围筛选、缩放、全屏并导出 PNG 地图。",
        "GLOBAL MAP": "全局地图",
        "Export Flight Records": "导出航班记录",
        "Export decrypted flight records as a CSV file after server-side verification and secure record processing.": "经服务端验证和安全处理后，将解密后的航班记录导出为 CSV 文件。",
        "CSV EXPORT": "CSV 导出",
        "Batch Import": "批量导入",
        "CSV Import": "CSV 导入",
        "Waiting for CSV file.": "等待 CSV 文件。",
        "Open": "打开",
        "Download": "下载",
        "Dashboard": "控制台",
        "Flight Records": "航班记录",
        "Add Flight": "新增航班",
        "Add": "新增",
        "Export CSV": "导出 CSV",
        "Records per page": "每页记录数",
        "Apply": "应用",
        "Filter current page": "筛选当前页",
        "Search all records": "搜索全部记录",
        "Clear": "清除",
        "Refresh": "刷新",
        "Rebuild Cache": "重建缓存",
        "No.": "编号",
        "Date": "日期",
        "Flight No.": "航班号",
        "A/C Type": "机型",
        "Departure": "出发",
        "Arrival": "到达",
        "Actions": "操作",
        "Loading flight records...": "正在加载航班记录...",
        "First Page": "首页",
        "Previous": "上一页",
        "Next": "下一页",
        "Ready": "就绪",
        "Loading page information...": "正在加载分页信息...",
        "Searching": "搜索中",
        "No matching flight records found.": "没有找到匹配的航班记录。",
        "No flight records found.": "没有航班记录。",
        "Flight Identity": "航班信息",
        "Flight Number": "航班号",
        "Aircraft Model": "飞机型号",
        "Flight Type": "航班类型",
        "Select flight type": "选择航班类型",
        "International": "国际线",
        "Domestic": "国内线",
        "Regional": "跨境地区线（港澳台）",
        "Regional(HK, MO, TW)": "跨境地区线（港澳台）",
        "Special": "特殊航线",
        "Date (Local Time)": "日期（本地时间）",
        "Baggage": "行李",
        "Baggage Detail": "行李详情",
        "Baggage & Additional Fares": "行李与附加费用",
        "Additional Fares": "附加费用",
        "Additional Fares Detail": "附加费用详情",
        "Fare Detail": "费用详情",
        "Route & Time": "航线与时间",
        "Departure Station": "出发机场",
        "Departure Terminal": "出发航站楼",
        "Departure Time": "出发时间",
        "Arrival Station": "到达机场",
        "Arrival Terminal": "到达航站楼",
        "Arrival Time": "到达时间",
        "Arrival Day": "到达日",
        "Arrival +1 Day": "跨日航班",
        "+1 Day": "+1 天",
        "Remarks & Comments": "备注与说明",
        "Save Flight Record": "保存航班记录",
        "Update Flight Record": "更新航班记录",
        "Edit Flight Record": "编辑航班记录",
        "View Record": "查看记录",
        "View Flight Record": "查看航班记录",
        "Flight Record Detail": "航班记录详情",
        "Edit Record": "编辑记录",
        "Record": "记录",
        "Record No.": "记录编号",
        "Payload Version": "数据版本",
        "Status": "状态",
        "Station / Terminal": "机场 / 航站楼",
        "Route Distance": "航线距离",
        "Airport Name": "机场名称",
        "Time": "时间",
        "Baggage & Remarks": "行李与备注",
        "Remarks": "备注",
        "Integrity & Timestamps": "完整性与时间戳",
        "Created At (UTC)": "创建时间（UTC）",
        "Updated At (UTC)": "更新时间（UTC）",
        "Created (UTC)": "创建时间（UTC）",
        "Updated (UTC)": "更新时间（UTC）",
        "Route Map": "航线地图",
        "Single flight route map": "单条航线地图",
        "Fit": "适配",
        "Fullscreen": "全屏",
        "Export PNG": "导出 PNG",
        "Loading map...": "正在加载地图...",
        "Visualize all recorded flights or a selected date range as great-circle routes. Repeated flights on the same sector are drawn as naturally layered curves, with the same start/end points and a gentle mid-route separation.": "将全部航班或指定日期范围内的航班可视化为大圆航线。同一航段的重复飞行会绘制为自然分层曲线，起终点一致，中段轻微分离。",
        "Start Date": "开始日期",
        "End Date": "结束日期",
        "Mode": "模式",
        "Layered Flights": "分层航班",
        "Aggregated Routes": "聚合航线",
        "Individual Flights": "单独航班",
        "Airport Names": "机场名称",
        "Airports": "机场",
        "Routes": "航线",
        "Draw Routes": "绘制航线",
        "Reset": "重置",
        "Route": "航线",
        "Selected": "已选",
        "Airport": "机场",
        "Top Sectors": "热门航段",
        "Missing Codes": "缺失代码",
        "Missing": "缺失",
        "None": "无",
        "Flight Log": "飞行日志记录系统",
        "Desktop": "桌面版",
        "Open desktop dashboard": "打开桌面控制台",
        "Cache": "缓存状态",
        "Revision": "缓存版本",
        "Local Time": "本地时间",
        "LOCAL TIME": "本地时间",
        "Add a new entry": "新增一条记录",
        "All Records": "全部记录",
        "Show my all flights": "查看我的全部航班",
        "Show my all flight routes": "查看我的全部航线",
        "Backup all records": "备份全部记录",
        "New entry": "新增记录",
        "Records": "记录",
        "Card list": "卡片列表",
        "Touch map": "触屏地图",
        "Home": "首页",
        "Flights": "航班一览",
        "Map": "地图",
        "List": "航班列表",
        "Flight List": "航班列表",
        "Flights List": "航班列表",
        "Search and settings": "搜索与设置",
        "Sectors": "航段",
        "Airlines": "航空公司",
        "Estimated Distance": "预估总飞行距离",
        "Search flight / airport / terminal": "搜索航班 / 机场 / 航站楼",
        "Loading...": "正在加载...",
        "Loading": "正在加载",
        "Flight Record": "航班记录",
        "Back": "返回",
        "Back to flight list": "返回航班列表",
        "Boarding pass reader": "登机牌读取器",
        "Boarding Pass": "登机牌",
        "Scan": "扫码",
        "Image": "图片",
        "Read": "读取",
        "Submit": "提交",
        "Stop": "停止",
        "BCBP data": "BCBP 数据",
        "BCBP flight segment": "BCBP 航段",
        "Flight": "航班",
        "Type": "类型",
        "Select type": "选择类型",
        "Aircraft": "飞机型号",
        "From": "出发",
        "Terminal": "航站楼",
        "To": "到达",
        "Detail": "详情",
        "Save Flight": "保存航班",
        "Update Flight": "更新航班",
        "View": "查看",
        "Edit": "编辑",
        "Delete": "删除",
        "Flight Detail": "航班详情",
        "Full": "全屏",
        "Mobile navigation": "移动端导航",
        "Flight list controls": "航班列表控制",
        "Flight statistics": "航班统计",
        "Estimated total flight distance": "预估总飞行距离",
        "Pull to refresh": "下拉刷新",
        "Release to refresh": "释放刷新",
        "Refreshing": "正在刷新",
        "Checking": "检查中",
        "Checking...": "检查中...",
        "unavailable": "不可用",
        "unknown": "未知",
        "Yes": "有",
        "No": "无",
        "Page -": "第 - 页",
        "Homepage": "主页",
        "Visit Homepage": "访问主页",
        "Licensed under the Apache License 2.0.": "基于 Apache License 2.0 授权。",
        "Licensed under the Apache License 2.0. Static aviation and map data are provided for personal log visualization only.": "基于 Apache License 2.0 授权。静态航空与地图数据仅用于个人日志可视化。"
      },
      replacements: [
        [/Seat, cabin class, lounge, aircraft notes, delay reason, special memory, etc\./g, "座位、舱位、休息室、飞机备注、延误原因、特别回忆等。"],
        [/Seat, cabin, lounge, delay notes/g, "座位、舱位、休息室、延误备注"],
        [/Flight Number:/g, "航班号："],
        [/Aircraft Model:/g, "飞机型号："],
        [/Flight Type: International/g, "航班类型：国际线"],
        [/Flight Type: Domestic/g, "航班类型：国内线"],
        [/Flight Type: Regional(?:\(HK, MO, TW\))?/g, "航班类型：跨境地区线（港澳台）"],
        [/Flight Type: Special/g, "航班类型：特殊航线"],
        [/Flight Type:/g, "航班类型："],
        [/Date:/g, "日期："],
        [/Departure Station:/g, "出发机场："],
        [/Departure Terminal:/g, "出发航站楼："],
        [/Departure Time:/g, "出发时间："],
        [/Arrival Station:/g, "到达机场："],
        [/Arrival Terminal:/g, "到达航站楼："],
        [/Arrival Time:/g, "到达时间："],
        [/Arrival \+1 Day:/g, "跨日航班："],
        [/Baggage:/g, "行李："],
        [/Additional Fares Detail:/g, "附加费用详情："],
        [/Additional Fares:/g, "附加费用："],
        [/\[Flight Identity\]/g, "【航班信息】"],
        [/\[Route & Time\]/g, "【航线与时间】"],
        [/\[Baggage & Additional Fares\]/g, "【行李与附加费用】"],
        [/\[Baggage\]/g, "【行李】"],
        [/\[Remarks\]/g, "【备注】"],
        [/Please confirm the flight record before saving\./g, "请在保存前确认航班记录。"],
        [/Please confirm the updated flight record before saving\./g, "请在保存前确认更新后的航班记录。"],
        [/This action cannot be undone\./g, "此操作无法撤销。"],
        [/Delete this flight record\?/g, "删除这条航班记录？"],
        [/Record No\.:/g, "记录编号："],
        [/Request failed with status/g, "请求失败，状态码"],
        [/Flight Number is required\./g, "请填写航班号。"],
        [/Date is required\./g, "请填写日期。"],
        [/Departure Station is required\./g, "请填写出发机场。"],
        [/Arrival Station is required\./g, "请填写到达机场。"],
        [/Baggage Detail is required when Baggage is Yes\./g, "选择托运行李时请填写行李详情。"],
        [/Baggage Detail is required\./g, "请填写行李详情。"],
        [/Additional Fares Detail is required when Additional Fares is Yes\./g, "选择附加费用时请填写费用详情。"],
        [/Additional Fares Detail is required\./g, "请填写附加费用详情。"],
        [/Saving flight record\.\.\./g, "正在保存航班记录..."],
        [/Updating flight record\.\.\./g, "正在更新航班记录..."],
        [/Loading flight record\.\.\./g, "正在加载航班记录..."],
        [/Flight record saved successfully\./g, "航班记录已保存。"],
        [/Flight record updated successfully\./g, "航班记录已更新。"],
        [/Flight record saved\./g, "航班记录已保存。"],
        [/Flight record updated\./g, "航班记录已更新。"],
        [/Flight record loaded\./g, "航班记录已加载。"],
        [/Boarding pass data applied\./g, "登机牌数据已应用。"],
        [/Failed to save flight record:/g, "保存航班记录失败："],
        [/Failed to update flight record:/g, "更新航班记录失败："],
        [/Failed to load flight record:/g, "加载航班记录失败："],
        [/Failed to delete flight record:/g, "删除航班记录失败："],
        [/Failed to load flight records:/g, "加载航班记录失败："],
        [/Failed to load flights:/g, "加载航班失败："],
        [/Failed to load map summary:/g, "加载地图摘要失败："],
        [/Failed to draw map:/g, "绘制地图失败："],
        [/Airport coordinate not found:/g, "未找到机场坐标："],
        [/Failed to load page information\./g, "加载分页信息失败。"],
        [/No flight records found in this page\./g, "当前页没有航班记录。"],
        [/No flight records found\./g, "没有找到航班记录。"],
        [/Offline \/ API unavailable/g, "离线 / API 不可用"],
        [/Rebuilding cache/g, "正在重建缓存"],
        [/Deleting/g, "正在删除"],
        [/Error/g, "错误"],
        [/Applied/g, "已应用"],
        [/Unreadable/g, "无法读取"],
        [/Unavailable/g, "不可用"],
        [/Reading/g, "正在读取"],
        [/Scanning/g, "正在扫描"],
        [/Camera unavailable/g, "相机不可用"],
        [/Barcode scanner unavailable/g, "条码扫描不可用"],
        [/No barcode detected/g, "未检测到条码"],
        [/Image could not be loaded/g, "图片无法加载"],
        [/Unsupported BCBP format/g, "不支持的 BCBP 格式"],
        [/BCBP data is empty/g, "BCBP 数据为空"],
        [/Invalid BCBP segment count/g, "BCBP 航段数量无效"],
        [/BCBP mandatory segment data is incomplete/g, "BCBP 必填航段数据不完整"],
        [/Click to highlight this sector\./g, "点击高亮此航段。"],
        [/Click to highlight this route\./g, "点击高亮此航线。"],
        [/Loading map\.\.\./g, "正在加载地图..."],
        [/Loading flight records\.\.\./g, "正在加载航班记录..."],
        [/Loading page information\.\.\./g, "正在加载分页信息..."],
        [/Page (\d+) of (\d+) · Showing (\d+) of (\d+) loaded records · Total (\d+)/g, "第 $1 / $2 页 · 显示 $3 / $4 条已加载记录 · 共 $5 条"],
        [/Page (\d+) \/ (\d+)/g, "第 $1 / $2 页"],
        [/Cache:/g, "缓存："],
        [/rev\./g, "版本 "],
        [/Records:/g, "记录："],
        [/Routes:/g, "航线："],
        [/Airports:/g, "机场："],
        [/Missing:/g, "缺失："],
        [/Summary:/g, "汇总："],
        [/Distance:/g, "距离："],
        [/Baggage:/g, "行李："],
        [/Additional Fares:/g, "附加费用："],
        [/route\(s\)/g, "条航线"],
        [/airport\(s\)/g, "个机场"],
        [/zoom/g, "缩放"],
        [/fallback map/g, "备用地图"],
        [/loading/g, "加载中"],
        [/loaded records/g, "条已加载记录"],
        [/Total/g, "共"],
        [/shown/g, "已显示"],
        [/times/g, "次"],
        [/time/g, "次"],
        [/km est\./g, "公里（估算）"],
        [/kg/g, "千克"],
        [/\/ page/g, " / 页"]
      ]
    },
    ja: {
      htmlLang: "ja-JP",
      label: "日",
      nativeName: "日本語",
      switcherLabel: "言語",
      exact: {
        "Dashboard - Personal Flight Log Management System": "ダッシュボード - 個人フライトログ管理システム",
        "Flight Records - Personal Flight Log Management System": "フライト記録 - 個人フライトログ管理システム",
        "Add Flight Record - Personal Flight Log Management System": "フライト記録を追加 - 個人フライトログ管理システム",
        "Edit Flight Record - Personal Flight Log Management System": "フライト記録を編集 - 個人フライトログ管理システム",
        "View Flight Record - Personal Flight Log Management System": "フライト記録を表示 - 個人フライトログ管理システム",
        "Flight Route Map - Personal Flight Log Management System": "フライトルートマップ - 個人フライトログ管理システム",
        "Mobile Dashboard - Personal Flight Log Management System": "モバイルダッシュボード - 個人フライトログ管理システム",
        "Mobile Flights List - Personal Flight Log Management System": "モバイルフライト一覧 - 個人フライトログ管理システム",
        "Mobile Map - Personal Flight Log Management System": "モバイルマップ - 個人フライトログ管理システム",
        "Mobile Add Flight - Personal Flight Log Management System": "モバイル フライト追加 - 個人フライトログ管理システム",
        "Mobile Edit Flight - Personal Flight Log Management System": "モバイル フライト編集 - 個人フライトログ管理システム",
        "Mobile Flight Detail - Personal Flight Log Management System": "モバイル フライト詳細 - 個人フライトログ管理システム",
        "Flight Log Dashboard": "ダッシュボード",
        "Personal Flight Log Management System": "個人フライトログ管理システム",
        "Manage encrypted flight records, review route histories, export CSV data, and visualize great-circle flight maps using a static OurAirports coordinate index.": "暗号化されたフライト記録を管理し、ルート履歴を確認し、CSV データをエクスポートし、静的な OurAirports 座標インデックスで大圏ルートマップを可視化します。",
        "System Information": "システム情報",
        "System Version": "システムバージョン",
        "Cache Status": "キャッシュ状態",
        "Cache Revision": "キャッシュリビジョン",
        "Current Time": "現在時刻",
        "Add Flight Record": "フライト記録を追加",
        "Register flight number, aircraft model, route, terminals, local date and time, baggage information, and remarks.": "便名、機材、ルート、ターミナル、現地日時、手荷物情報、メモを登録します。",
        "NEW ENTRY": "新規登録",
        "Show Flight Records": "フライト記録を表示",
        "Browse encrypted flight records through the cached paginated table.": "キャッシュされたページ付きテーブルで暗号化フライト記録を閲覧します。",
        "CACHED VIEW": "キャッシュ表示",
        "Flight Route Map": "フライトルートマップ",
        "View all recorded flights as great-circle routes, filter by date range, zoom, fullscreen, and export the map as PNG.": "すべての記録を大圏ルートとして表示し、日付範囲で絞り込み、ズーム、全画面、PNG エクスポートができます。",
        "GLOBAL MAP": "全体マップ",
        "Export Flight Records": "記録をエクスポート",
        "Export decrypted flight records as a CSV file after server-side verification and secure record processing.": "サーバー側の検証と安全な処理の後、復号済みフライト記録を CSV ファイルとしてエクスポートします。",
        "CSV EXPORT": "CSV エクスポート",
        "Batch Import": "一括インポート",
        "CSV Import": "CSV インポート",
        "Waiting for CSV file.": "CSV ファイル待機中。",
        "Open": "開く",
        "Download": "ダウンロード",
        "Dashboard": "ダッシュボード",
        "Flight Records": "フライト記録",
        "Add Flight": "フライト追加",
        "Add": "追加",
        "Export CSV": "CSV 出力",
        "Records per page": "1ページあたりの件数",
        "Apply": "適用",
        "Filter current page": "現在のページを絞り込み",
        "Search all records": "全記録を検索",
        "Clear": "クリア",
        "Refresh": "更新",
        "Rebuild Cache": "キャッシュ再構築",
        "No.": "No.",
        "Date": "日付",
        "Flight No.": "便名",
        "A/C Type": "機種",
        "Departure": "出発",
        "Arrival": "到着",
        "Actions": "操作",
        "Loading flight records...": "フライト記録を読み込み中...",
        "First Page": "先頭ページ",
        "Previous": "前へ",
        "Next": "次へ",
        "Ready": "準備完了",
        "Loading page information...": "ページ情報を読み込み中...",
        "Searching": "検索中",
        "No matching flight records found.": "一致するフライト記録がありません。",
        "No flight records found.": "フライト記録がありません。",
        "Flight Identity": "フライト情報",
        "Flight Number": "便名",
        "Aircraft Model": "機材",
        "Flight Type": "フライト種別",
        "Select flight type": "フライト種別を選択",
        "International": "国際線",
        "Domestic": "国内線",
        "Regional": "越境地区線",
        "Regional(HK, MO, TW)": "越境地区線",
        "Special": "特別フライト",
        "Date (Local Time)": "日付（現地時刻）",
        "Baggage": "手荷物",
        "Baggage Detail": "手荷物詳細",
        "Baggage & Additional Fares": "手荷物・追加料金",
        "Additional Fares": "追加料金",
        "Additional Fares Detail": "追加料金詳細",
        "Fare Detail": "料金詳細",
        "Route & Time": "ルートと時刻",
        "Departure Station": "出発空港",
        "Departure Terminal": "出発ターミナル",
        "Departure Time": "出発時刻",
        "Arrival Station": "到着空港",
        "Arrival Terminal": "到着ターミナル",
        "Arrival Time": "到着時刻",
        "Arrival Day": "到着日",
        "Arrival +1 Day": "翌日到着",
        "+1 Day": "+1 日",
        "Remarks & Comments": "備考・コメント",
        "Save Flight Record": "フライト記録を保存",
        "Update Flight Record": "フライト記録を更新",
        "Edit Flight Record": "フライト記録を編集",
        "View Record": "記録を表示",
        "View Flight Record": "フライト記録を表示",
        "Flight Record Detail": "フライト記録詳細",
        "Edit Record": "記録を編集",
        "Record": "記録",
        "Record No.": "記録番号",
        "Payload Version": "ペイロードバージョン",
        "Status": "状態",
        "Station / Terminal": "空港 / ターミナル",
        "Route Distance": "ルート距離",
        "Airport Name": "空港名",
        "Time": "時刻",
        "Baggage & Remarks": "手荷物・備考",
        "Remarks": "備考",
        "Integrity & Timestamps": "整合性・タイムスタンプ",
        "Created At (UTC)": "作成日時（UTC）",
        "Updated At (UTC)": "更新日時（UTC）",
        "Created (UTC)": "作成日時（UTC）",
        "Updated (UTC)": "更新日時（UTC）",
        "Route Map": "ルートマップ",
        "Single flight route map": "単一フライトのルートマップ",
        "Fit": "全体表示",
        "Fullscreen": "全画面",
        "Export PNG": "PNG 出力",
        "Loading map...": "地図を読み込み中...",
        "Visualize all recorded flights or a selected date range as great-circle routes. Repeated flights on the same sector are drawn as naturally layered curves, with the same start/end points and a gentle mid-route separation.": "すべての記録、または選択した日付範囲のフライトを大圏ルートとして可視化します。同じ区間の重複フライトは、同じ始点・終点を保ちながら中間部を少し分離した自然なレイヤー曲線で表示します。",
        "Start Date": "開始日",
        "End Date": "終了日",
        "Mode": "モード",
        "Layered Flights": "レイヤー表示",
        "Aggregated Routes": "集計ルート",
        "Individual Flights": "個別フライト",
        "Airport Names": "空港名",
        "Airports": "空港",
        "Routes": "ルート",
        "Draw Routes": "ルート描画",
        "Reset": "リセット",
        "Route": "ルート",
        "Selected": "選択中",
        "Airport": "空港",
        "Top Sectors": "上位区間",
        "Missing Codes": "未解決コード",
        "Missing": "未解決",
        "None": "なし",
        "Flight Log": "フライトログ",
        "Desktop": "デスクトップ",
        "Open desktop dashboard": "デスクトップ ダッシュボードを開く",
        "Cache": "キャッシュ状態",
        "Revision": "キャッシュ版",
        "Local Time": "ローカル時刻",
        "LOCAL TIME": "ローカル時刻",
        "Add a new entry": "新規記録を追加",
        "All Records": "全記録",
        "Show my all flights": "すべてのフライトを表示",
        "Show my all flight routes": "すべてのルートを表示",
        "Backup all records": "全記録をバックアップ",
        "New entry": "新規登録",
        "Records": "記録",
        "Card list": "カード一覧",
        "Touch map": "タッチマップ",
        "Home": "ホーム",
        "Flights": "フライト一覧",
        "Map": "マップ",
        "List": "フライト一覧",
        "Flight List": "フライト一覧",
        "Flights List": "フライト一覧",
        "Search and settings": "検索と設定",
        "Sectors": "区間",
        "Airlines": "航空会社",
        "Estimated Distance": "推定距離",
        "Search flight / airport / terminal": "便名 / 空港 / ターミナルを検索",
        "Loading...": "読み込み中...",
        "Loading": "読み込み中",
        "Flight Record": "フライト記録",
        "Back": "戻る",
        "Back to flight list": "フライト一覧へ戻る",
        "Boarding pass reader": "搭乗券リーダー",
        "Boarding Pass": "搭乗券",
        "Scan": "スキャン",
        "Image": "画像",
        "Read": "読取",
        "Submit": "適用",
        "Stop": "停止",
        "BCBP data": "BCBP データ",
        "BCBP flight segment": "BCBP フライト区間",
        "Flight": "フライト",
        "Type": "種別",
        "Select type": "種別を選択",
        "Aircraft": "機材",
        "From": "出発",
        "Terminal": "ターミナル",
        "To": "到着",
        "Detail": "詳細",
        "Save Flight": "フライト保存",
        "Update Flight": "フライト更新",
        "View": "表示",
        "Edit": "編集",
        "Delete": "削除",
        "Flight Detail": "フライト詳細",
        "Full": "全画面",
        "Mobile navigation": "モバイルナビゲーション",
        "Flight list controls": "フライト一覧操作",
        "Flight statistics": "フライト統計",
        "Estimated total flight distance": "推定総飛行距離",
        "Pull to refresh": "下に引いて更新",
        "Release to refresh": "離して更新",
        "Refreshing": "更新中",
        "Checking": "確認中",
        "Checking...": "確認中...",
        "unavailable": "利用不可",
        "unknown": "不明",
        "Yes": "あり",
        "No": "なし",
        "Page -": "ページ -",
        "Homepage": "ホームページ",
        "Visit Homepage": "ホームページを見る",
        "Licensed under the Apache License 2.0.": "Apache License 2.0 の下でライセンスされています。",
        "Licensed under the Apache License 2.0. Static aviation and map data are provided for personal log visualization only.": "Apache License 2.0 の下でライセンスされています。静的な航空・地図データは個人ログの可視化目的でのみ使用します。"
      },
      replacements: [
        [/Seat, cabin class, lounge, aircraft notes, delay reason, special memory, etc\./g, "座席、クラス、ラウンジ、機材メモ、遅延理由、思い出など。"],
        [/Seat, cabin, lounge, delay notes/g, "座席、クラス、ラウンジ、遅延メモ"],
        [/Flight Number:/g, "便名："],
        [/Aircraft Model:/g, "機材："],
        [/Flight Type: International/g, "フライト種別：国際線"],
        [/Flight Type: Domestic/g, "フライト種別：国内線"],
        [/Flight Type: Regional(?:\(HK, MO, TW\))?/g, "フライト種別：越境地区線"],
        [/Flight Type: Special/g, "フライト種別：特別フライト"],
        [/Flight Type:/g, "フライト種別："],
        [/Date:/g, "日付："],
        [/Departure Station:/g, "出発空港："],
        [/Departure Terminal:/g, "出発ターミナル："],
        [/Departure Time:/g, "出発時刻："],
        [/Arrival Station:/g, "到着空港："],
        [/Arrival Terminal:/g, "到着ターミナル："],
        [/Arrival Time:/g, "到着時刻："],
        [/Arrival \+1 Day:/g, "翌日到着："],
        [/Baggage:/g, "手荷物："],
        [/Additional Fares Detail:/g, "追加料金詳細："],
        [/Additional Fares:/g, "追加料金："],
        [/\[Flight Identity\]/g, "【フライト情報】"],
        [/\[Route & Time\]/g, "【ルートと時刻】"],
        [/\[Baggage & Additional Fares\]/g, "【手荷物・追加料金】"],
        [/\[Baggage\]/g, "【手荷物】"],
        [/\[Remarks\]/g, "【備考】"],
        [/Please confirm the flight record before saving\./g, "保存前にフライト記録を確認してください。"],
        [/Please confirm the updated flight record before saving\./g, "保存前に更新後のフライト記録を確認してください。"],
        [/This action cannot be undone\./g, "この操作は取り消せません。"],
        [/Delete this flight record\?/g, "このフライト記録を削除しますか？"],
        [/Record No\.:/g, "記録番号："],
        [/Request failed with status/g, "リクエスト失敗、ステータス"],
        [/Flight Number is required\./g, "便名は必須です。"],
        [/Date is required\./g, "日付は必須です。"],
        [/Departure Station is required\./g, "出発空港は必須です。"],
        [/Arrival Station is required\./g, "到着空港は必須です。"],
        [/Baggage Detail is required when Baggage is Yes\./g, "手荷物ありの場合は手荷物詳細が必須です。"],
        [/Baggage Detail is required\./g, "手荷物詳細は必須です。"],
        [/Additional Fares Detail is required when Additional Fares is Yes\./g, "追加料金ありの場合は料金詳細が必須です。"],
        [/Additional Fares Detail is required\./g, "追加料金詳細は必須です。"],
        [/Saving flight record\.\.\./g, "フライト記録を保存中..."],
        [/Updating flight record\.\.\./g, "フライト記録を更新中..."],
        [/Loading flight record\.\.\./g, "フライト記録を読み込み中..."],
        [/Flight record saved successfully\./g, "フライト記録を保存しました。"],
        [/Flight record updated successfully\./g, "フライト記録を更新しました。"],
        [/Flight record saved\./g, "フライト記録を保存しました。"],
        [/Flight record updated\./g, "フライト記録を更新しました。"],
        [/Flight record loaded\./g, "フライト記録を読み込みました。"],
        [/Boarding pass data applied\./g, "搭乗券データを適用しました。"],
        [/Failed to save flight record:/g, "フライト記録の保存に失敗しました："],
        [/Failed to update flight record:/g, "フライト記録の更新に失敗しました："],
        [/Failed to load flight record:/g, "フライト記録の読み込みに失敗しました："],
        [/Failed to delete flight record:/g, "フライト記録の削除に失敗しました："],
        [/Failed to load flight records:/g, "フライト記録の読み込みに失敗しました："],
        [/Failed to load flights:/g, "フライトの読み込みに失敗しました："],
        [/Failed to load map summary:/g, "地図サマリーの読み込みに失敗しました："],
        [/Failed to draw map:/g, "地図の描画に失敗しました："],
        [/Airport coordinate not found:/g, "空港座標が見つかりません："],
        [/Failed to load page information\./g, "ページ情報の読み込みに失敗しました。"],
        [/No flight records found in this page\./g, "このページにフライト記録はありません。"],
        [/No flight records found\./g, "フライト記録はありません。"],
        [/Offline \/ API unavailable/g, "オフライン / API 利用不可"],
        [/Rebuilding cache/g, "キャッシュ再構築中"],
        [/Deleting/g, "削除中"],
        [/Error/g, "エラー"],
        [/Applied/g, "適用済み"],
        [/Unreadable/g, "読取不可"],
        [/Unavailable/g, "利用不可"],
        [/Reading/g, "読取中"],
        [/Scanning/g, "スキャン中"],
        [/Camera unavailable/g, "カメラを利用できません"],
        [/Barcode scanner unavailable/g, "バーコードスキャナーを利用できません"],
        [/No barcode detected/g, "バーコードを検出できません"],
        [/Image could not be loaded/g, "画像を読み込めません"],
        [/Unsupported BCBP format/g, "未対応の BCBP 形式です"],
        [/BCBP data is empty/g, "BCBP データが空です"],
        [/Invalid BCBP segment count/g, "BCBP 区間数が無効です"],
        [/BCBP mandatory segment data is incomplete/g, "BCBP 必須区間データが不完全です"],
        [/Click to highlight this sector\./g, "クリックしてこの区間を強調表示します。"],
        [/Click to highlight this route\./g, "クリックしてこのルートを強調表示します。"],
        [/Loading map\.\.\./g, "地図を読み込み中..."],
        [/Loading flight records\.\.\./g, "フライト記録を読み込み中..."],
        [/Loading page information\.\.\./g, "ページ情報を読み込み中..."],
        [/Page (\d+) of (\d+) · Showing (\d+) of (\d+) loaded records · Total (\d+)/g, "$1 / $2 ページ · 読み込み済み $4 件中 $3 件を表示 · 合計 $5 件"],
        [/Page (\d+) \/ (\d+)/g, "$1 / $2 ページ"],
        [/Cache:/g, "キャッシュ："],
        [/rev\./g, "rev."],
        [/Records:/g, "記録："],
        [/Routes:/g, "ルート："],
        [/Airports:/g, "空港："],
        [/Missing:/g, "未解決："],
        [/Summary:/g, "概要："],
        [/Distance:/g, "距離："],
        [/Baggage:/g, "手荷物："],
        [/Additional Fares:/g, "追加料金："],
        [/route\(s\)/g, "ルート"],
        [/airport\(s\)/g, "空港"],
        [/zoom/g, "ズーム"],
        [/fallback map/g, "代替地図"],
        [/loading/g, "読み込み中"],
        [/loaded records/g, "読み込み済み記録"],
        [/Total/g, "合計"],
        [/shown/g, "表示"],
        [/times/g, "回"],
        [/time/g, "回"],
        [/km est\./g, "km（推定）"],
        [/kg/g, "kg"],
        [/\/ page/g, " / ページ"]
      ]
    }
  };

  const originalTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();
  let currentLanguage = normalizeLanguage(readStoredLanguage());
  let originalTitle = document.title;
  let isApplying = false;
  let sweepTimer = 0;
  let hasLocalizedPage = false;

  function readStoredLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function writeStoredLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      // localStorage can be unavailable in restricted browsing modes.
    }
  }

  function normalizeLanguage(language) {
    if (language === "zh-CN" || language === "zh") return "zh";
    if (language === "ja-JP" || language === "ja") return "ja";
    return DEFAULT_LANGUAGE;
  }

  function getLanguageData(language = currentLanguage) {
    return languages[normalizeLanguage(language)] || languages[DEFAULT_LANGUAGE];
  }

  function localizeString(value, language = currentLanguage) {
    const normalized = normalizeLanguage(language);
    const text = String(value ?? "");
    if (normalized === DEFAULT_LANGUAGE || !text.trim()) return text;

    const data = getLanguageData(normalized);
    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    const core = text.trim();
    let localized = Object.prototype.hasOwnProperty.call(data.exact, core) ? data.exact[core] : null;
    if (!localized) {
      localized = core;
      for (const [pattern, replacement] of data.replacements) {
        localized = localized.replace(pattern, replacement);
      }
    }
    return leading + localized + trailing;
  }

  function isSkippableElement(element) {
    return !element ||
      ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(element.tagName) ||
      element.closest?.("[data-no-localize]");
  }

  function shouldSkipNode(node) {
    if (!node) return true;
    if (node.nodeType === Node.ELEMENT_NODE) return isSkippableElement(node);
    if (node.nodeType === Node.TEXT_NODE) return isSkippableElement(node.parentElement);
    return true;
  }

  function getAttributeSources(element) {
    let sources = originalAttributes.get(element);
    if (!sources) {
      sources = Object.create(null);
      originalAttributes.set(element, sources);
    }
    return sources;
  }

  function translateTextNode(node, forceSource = false) {
    if (shouldSkipNode(node) || !node.nodeValue.trim()) return;
    if (forceSource || !originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const source = originalTextNodes.get(node);
    const next = currentLanguage === DEFAULT_LANGUAGE ? source : localizeString(source);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element, forceSource = false) {
    if (shouldSkipNode(element)) return;
    const sources = getAttributeSources(element);
    for (const name of ATTRIBUTES) {
      if (!element.hasAttribute?.(name)) continue;
      if (forceSource || !Object.prototype.hasOwnProperty.call(sources, name)) {
        sources[name] = element.getAttribute(name) || "";
      }
      const source = sources[name];
      const next = currentLanguage === DEFAULT_LANGUAGE ? source : localizeString(source);
      if (element.getAttribute(name) !== next) element.setAttribute(name, next);
    }
  }

  function translateNode(node, forceSource = false) {
    if (!node || shouldSkipNode(node)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node, forceSource);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    translateAttributes(node, forceSource);
    for (const child of node.childNodes) translateNode(child, forceSource);
  }

  function translateTitle() {
    document.documentElement.lang = getLanguageData().htmlLang;
    const next = currentLanguage === DEFAULT_LANGUAGE ? originalTitle : localizeString(originalTitle);
    if (document.title !== next) document.title = next;
  }

  function withSuppressedObserver(callback) {
    isApplying = true;
    try {
      callback();
    } finally {
      queueMicrotask(() => {
        isApplying = false;
      });
    }
  }

  function setLanguage(language, persist = false) {
    currentLanguage = normalizeLanguage(language);
    if (persist) writeStoredLanguage(currentLanguage);
    withSuppressedObserver(() => {
      translateTitle();
      if (currentLanguage !== DEFAULT_LANGUAGE || hasLocalizedPage) {
        translateNode(document.body);
        hasLocalizedPage = true;
      }
      updateSwitcher();
    });
    if (currentLanguage !== DEFAULT_LANGUAGE) scheduleTranslationSweep(120);
  }

  function scheduleTranslationSweep(delay = 80) {
    if (currentLanguage === DEFAULT_LANGUAGE && !hasLocalizedPage) return;
    if (sweepTimer) clearTimeout(sweepTimer);
    sweepTimer = setTimeout(() => {
      sweepTimer = 0;
      withSuppressedObserver(() => {
        translateTitle();
        if (currentLanguage !== DEFAULT_LANGUAGE || hasLocalizedPage) translateNode(document.body);
        updateSwitcher();
      });
    }, delay);
  }

  function injectSwitcherStyles() {
    if (document.getElementById("languageSwitcherStyles")) return;
    const style = document.createElement("style");
    style.id = "languageSwitcherStyles";
    style.textContent = `
html[lang="zh-CN"] body{font-family:Inter,"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif}
html[lang="ja-JP"] body{font-family:Inter,"Yu Gothic","Hiragino Sans","Noto Sans CJK JP",system-ui,sans-serif}
.language-switcher{position:relative;z-index:80;display:inline-flex;align-items:center;flex:0 0 auto;font-family:inherit}
.language-switcher.is-open{z-index:1200}
.language-switcher-button{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:42px;min-width:66px;padding:0 12px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(240,249,255,.58));box-shadow:0 10px 24px rgba(2,132,199,.10),inset 0 1px 0 rgba(255,255,255,.86);color:#075985;cursor:pointer;font-weight:900;letter-spacing:0;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);touch-action:manipulation}
.language-switcher-button:before{content:"";position:absolute;inset:0;padding:1px;border-radius:inherit;background:linear-gradient(115deg,transparent 0 18%,rgba(125,211,252,.34) 34%,rgba(168,85,247,.20) 50%,rgba(245,158,11,.16) 64%,transparent 80%);background-size:220% 100%;animation:languageBorderFlow 6.8s linear infinite;pointer-events:none;opacity:.62;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.language-switcher-button:focus-visible{outline:3px solid rgba(14,165,233,.26);outline-offset:3px}
.language-switcher-mark{font-family:Consolas,Cascadia Mono,SFMono-Regular,Menlo,monospace;font-size:.78rem;line-height:1;color:#075985;white-space:nowrap}
.language-switcher-current{font-size:.68rem;line-height:1;color:#0e7490;white-space:nowrap}
.language-switcher-menu{position:absolute;z-index:1201;top:calc(100% + 8px);right:0;display:grid;gap:4px;min-width:132px;padding:6px;border:1px solid rgba(255,255,255,.76);border-radius:18px;background:rgba(248,252,255,.86);box-shadow:0 18px 36px rgba(8,47,73,.16),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;transform:translateY(-4px) scale(.98);transform-origin:top right;transition:opacity .16s ease,transform .16s ease,visibility .16s ease}
.language-switcher.is-open .language-switcher-menu{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
.language-switcher-option{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:9px 10px;border:0;border-radius:12px;background:transparent;color:#0f3752;font:900 .78rem/1.1 inherit;text-align:left;white-space:nowrap;cursor:pointer}
.language-switcher-option span{overflow:hidden;text-overflow:ellipsis}
.language-switcher-option b{font-family:Consolas,Cascadia Mono,SFMono-Regular,Menlo,monospace;color:#0284c7;font-size:.74rem}
.language-switcher-option:hover,.language-switcher-option.is-active{background:rgba(186,230,253,.46);color:#075985}
.topbar.has-language-switcher,.mobile-topbar.has-language-switcher,.mobile-map-header.has-language-switcher,.dashboard-toolbar.has-language-switcher{z-index:4000!important;overflow:visible}
.topbar.has-language-switcher .nav,.topbar.has-language-switcher .topbar-actions,.mobile-map-header-actions,.mobile-topbar-actions.has-language-switcher{position:relative;z-index:4001}
.status-panel.has-language-switcher{position:relative;z-index:30}
.header-main.has-language-switcher{position:relative;z-index:40}
.header-main>.language-switcher{margin-left:10px;vertical-align:middle}
.header-main>.language-switcher .language-switcher-menu{left:0;right:auto;transform-origin:top left}
.topbar-actions,.mobile-map-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;min-width:0}
.topbar .nav .language-switcher{margin-left:4px}
.status-panel>.language-switcher{float:right;margin:-4px 0 8px 12px}
.mobile-topbar-actions .language-switcher,.mobile-map-header-actions .language-switcher{margin-left:0}
.mobile-topbar>.language-switcher{margin-left:auto}
.mobile-map-header-actions{gap:8px;flex:0 0 auto}
.mobile-map-header-actions .mobile-icon-link{white-space:nowrap}
.mobile-app .language-switcher-button{width:46px;min-width:46px;height:46px;padding:0}
.mobile-app .language-switcher-current{display:none}
.mobile-app .language-switcher-mark{font-size:.72rem}
.mobile-app .language-switcher-menu{min-width:118px;border-radius:16px}
.mobile-list .mobile-topbar h1{font-size:clamp(1.72rem,7.3vw,2.48rem)}
html[lang="zh-CN"] .mobile-home .mobile-status-panel span{text-transform:none;font-size:.72rem}
html[lang="zh-CN"] .mobile-distance-panel span{text-transform:none;font-size:.72rem}
html[lang="zh-CN"] .mobile-map-actions button{min-width:40px;font-size:.82rem;white-space:nowrap}
html[lang="ja-JP"] .mobile-topbar h1{font-size:clamp(1.55rem,6.7vw,2.28rem);line-height:1.06}
html[lang="ja-JP"] .mobile-home .mobile-topbar{gap:8px}
html[lang="ja-JP"] .mobile-home .mobile-topbar h1{font-size:clamp(1.38rem,5.7vw,1.68rem);white-space:nowrap}
html[lang="ja-JP"] .mobile-home .mobile-topbar-actions{gap:6px}
html[lang="ja-JP"] .mobile-kicker{font-size:.66rem}
html[lang="ja-JP"] .mobile-icon-link{padding-left:11px;padding-right:11px;white-space:nowrap}
html[lang="ja-JP"] .mobile-action-card strong{font-size:1rem;line-height:1.18}
html[lang="ja-JP"] .mobile-map-actions button{min-width:34px;padding:0 8px;font-size:.72rem;line-height:1.05;white-space:nowrap}
.mobile-map-actions{flex-wrap:nowrap}
.mobile-map-actions button{width:auto;white-space:nowrap;line-height:1}
@keyframes languageBorderFlow{from{background-position:0 0}to{background-position:220% 0}}
@media(max-width:390px){.mobile-app .language-switcher-button{width:42px;min-width:42px;height:42px}.mobile-app .language-switcher-mark{font-size:.68rem}.language-switcher-menu{right:-2px}}
@media(prefers-reduced-motion:reduce){.language-switcher-button:before{animation:none!important}}
`;
    document.head.appendChild(style);
  }

  function createSwitcher() {
    if (document.getElementById("languageSwitcher")) return;
    const root = document.createElement("div");
    root.id = "languageSwitcher";
    root.className = "language-switcher";
    root.dataset.noLocalize = "true";
    root.innerHTML = `
      <button class="language-switcher-button" type="button" aria-haspopup="true" aria-expanded="false">
        <span class="language-switcher-mark" aria-hidden="true">文/A</span>
        <span class="language-switcher-current">EN</span>
      </button>
      <div class="language-switcher-menu" role="menu" aria-label="Language">
        <button class="language-switcher-option" type="button" role="menuitem" data-language="en"><span>English</span><b>EN</b></button>
        <button class="language-switcher-option" type="button" role="menuitem" data-language="zh"><span>简体中文</span><b>中</b></button>
        <button class="language-switcher-option" type="button" role="menuitem" data-language="ja"><span>日本語</span><b>日</b></button>
      </div>
    `;

    const host = findSwitcherHost();
    host?.classList?.add("has-language-switcher");
    const stackingHost = host?.closest?.(".topbar,.mobile-topbar,.mobile-map-header,.status-panel,.header-main") || host;
    stackingHost?.classList?.add("has-language-switcher");
    if (host?.classList?.contains("status-panel")) {
      host.insertBefore(root, host.firstElementChild);
    } else if (host?.classList?.contains("header-main")) {
      host.insertBefore(root, host.firstElementChild?.nextSibling || null);
    } else {
      (host || document.body).appendChild(root);
    }

    const button = root.querySelector(".language-switcher-button");
    button.addEventListener("click", () => {
      const open = !root.classList.contains("is-open");
      root.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
    root.querySelectorAll("[data-language]").forEach((option) => {
      option.addEventListener("click", () => {
        setLanguage(option.dataset.language, true);
        closeSwitcher();
      });
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) closeSwitcher();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSwitcher();
    });
  }

  function findSwitcherHost() {
    return document.querySelector(".dashboard-toolbar") ||
      document.querySelector(".mobile-topbar-actions") ||
      ensureMobileMapActionHost() ||
      ensureMobileTopbarActionHost() ||
      ensureTopbarActionHost() ||
      document.querySelector(".header-main") ||
      document.querySelector(".status-panel") ||
      document.querySelector(".header") ||
      document.body;
  }

  function ensureTopbarActionHost() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return null;
    const nav = topbar.querySelector(".nav");
    if (nav) return nav;
    let actions = topbar.querySelector(".topbar-actions");
    if (actions) return actions;
    const items = Array.from(topbar.children).filter((child) =>
      child.matches?.("a,button,.pill-link,.btn")
    );
    if (!items.length) return topbar;
    actions = document.createElement("div");
    actions.className = "topbar-actions";
    for (const item of items) actions.appendChild(item);
    topbar.appendChild(actions);
    return actions;
  }

  function ensureMobileTopbarActionHost() {
    const topbar = document.querySelector(".mobile-topbar");
    if (!topbar) return null;
    let actions = topbar.querySelector(".mobile-topbar-actions");
    if (actions) return actions;
    const items = Array.from(topbar.children).filter((child) =>
      child.matches?.("a.mobile-icon-link,button.mobile-icon-link")
    );
    if (!items.length) return null;
    actions = document.createElement("div");
    actions.className = "mobile-topbar-actions";
    for (const item of items) actions.appendChild(item);
    topbar.appendChild(actions);
    return actions;
  }

  function ensureMobileMapActionHost() {
    const header = document.querySelector(".mobile-map-header");
    if (!header) return null;
    let actions = header.querySelector(".mobile-map-header-actions");
    if (actions) return actions;
    const items = Array.from(header.children).filter((child) =>
      child.matches?.("a.mobile-icon-link,button.mobile-icon-link")
    );
    if (!items.length) return header;
    actions = document.createElement("div");
    actions.className = "mobile-map-header-actions";
    for (const item of items) actions.appendChild(item);
    header.appendChild(actions);
    return actions;
  }

  function closeSwitcher() {
    const root = document.getElementById("languageSwitcher");
    if (!root) return;
    root.classList.remove("is-open");
    root.querySelector(".language-switcher-button")?.setAttribute("aria-expanded", "false");
  }

  function updateSwitcher() {
    const root = document.getElementById("languageSwitcher");
    if (!root) return;
    const data = getLanguageData();
    const button = root.querySelector(".language-switcher-button");
    root.querySelector(".language-switcher-current").textContent = data.label;
    button.setAttribute("aria-label", data.switcherLabel);
    root.querySelectorAll("[data-language]").forEach((option) => {
      option.classList.toggle("is-active", normalizeLanguage(option.dataset.language) === currentLanguage);
    });
  }

  const nativeAlert = window.alert?.bind(window);
  const nativeConfirm = window.confirm?.bind(window);
  if (nativeAlert) window.alert = (message) => nativeAlert(localizeString(message));
  if (nativeConfirm) window.confirm = (message) => nativeConfirm(localizeString(message));

  function run() {
    originalTitle = document.title;
    injectSwitcherStyles();
    createSwitcher();
    setLanguage(currentLanguage, false);
    if (currentLanguage !== DEFAULT_LANGUAGE) {
      scheduleTranslationSweep(450);
      window.addEventListener("load", () => scheduleTranslationSweep(250), { once: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  new MutationObserver((mutations) => {
    if (currentLanguage === DEFAULT_LANGUAGE) return;
    if (isApplying) {
      scheduleTranslationSweep(120);
      return;
    }
    withSuppressedObserver(() => {
      translateTitle();
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, true);
          continue;
        }
        if (mutation.type === "attributes") {
          translateAttributes(mutation.target, true);
          continue;
        }
        for (const node of mutation.addedNodes) translateNode(node, true);
      }
      updateSwitcher();
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES
  });

  window.FlightLogLanguage = {
    get: () => currentLanguage,
    set: (language) => setLanguage(language, true),
    translate: (value, language) => localizeString(value, language)
  };
  window.AzureXFlightLanguage = window.FlightLogLanguage;
})();
