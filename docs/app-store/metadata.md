# App Store Connect metadata — OmniSeam 3D (iOS / iPadOS)

Paste these into App Store Connect → App Information / Version Information.
Character limits: Name 30 · Subtitle 30 · Promotional text 170 · Keywords 100 (comma-separated, no spaces needed) · Description 4000.

> Rules applied: brand names such as SolidWorks / Inventor / Rhino appear **only** in the description as "compatible with … files", **never** in Name, Subtitle or Keywords (Guideline 2.3.7 / 5.2.1). No absolute privacy claims (2.3.1): local mode stays on device, cloud mode is optional and consented.

## Common fields

| Field | Value |
|---|---|
| Bundle ID | `io.github.hauchiehlinops.omniseam3d` (change in `frontend/capacitor.config.ts` + Xcode before first upload if you own a domain) |
| SKU | `omniseam3d-ios` |
| Primary category | Productivity |
| Secondary category | Graphics & Design |
| Age rating | 4+ (no objectionable content; unrestricted web access: **No**) |
| Price | Free · no in-app purchases |
| Privacy Policy URL | https://omniseam-3d.vercel.app/privacy.html |
| Support URL | https://omniseam-3d.vercel.app/support.html |
| Marketing URL | https://omniseam-3d.vercel.app |
| Copyright | © 2026 @B&B |
| Encryption | Uses only standard HTTPS → `ITSAppUsesNonExemptEncryption = NO` (already in Info.plist) |

---

## English (U.S.) — primary

**Name:** OmniSeam 3D: STL Mesh Repair
**Subtitle:** 3D Model Converter & Viewer
**Promotional text:** Open, inspect, repair and convert 3D models right on your iPhone and iPad. No account, no upload — cloud processing for native CAD only when you choose it.
**Keywords:** obj,3mf,step,iges,glb,gltf,usdz,ply,cad,print,printer,slicer,fix,heal,watertight,hole,ar,file,scan

**Description:**
OmniSeam 3D inspects, repairs and converts 3D models directly on your device.

ON-DEVICE (works offline)
• Open STL, OBJ, 3MF, PLY, OFF, GLB/glTF and faceted STEP files from Files or any app's Share sheet
• Health report: open holes, non-manifold edges, degenerate faces, volume, surface area, bounding box
• Repair: weld vertices, fix normals, fill holes, remove degenerate triangles
• Convert between STL, OBJ, 3MF, GLB and more, then save to Files, AirDrop or your slicer
• Section plane, distance measurement, wireframe, normals and X-ray views
• View any model in your room with AR Quick Look

OPTIONAL CLOUD NODE
Parametric STEP/IGES and native CAD/BIM files (compatible with SolidWorks, Inventor, Rhino, IFC and DWG files) need a processing node. Use the free public demo node (files up to 25 MB, deleted within 1 hour) or create your own free node on Hugging Face in a few minutes. The app always asks before uploading a file.

PRIVACY
No account, no ads, no analytics or tracking. Local mode never sends your files anywhere.

Includes three sample models so you can try everything without your own files. Available in English, 繁體中文, 简体中文, 日本語, 한국어 and ไทย.

---

## 繁體中文（台灣）

**名稱：** OmniSeam 3D：STL 模型修復
**副標題：** 3D 轉檔、檢視與列印破面修補
**宣傳文字：** 直接在 iPhone 與 iPad 上開啟、檢查、修復與轉換 3D 模型。不需帳號、不需上傳；只有在你選擇時才使用雲端處理原生 CAD。
**關鍵字：** 3D列印,網格,水密,補洞,切片,轉換器,檢視器,CAD,工程,建模,實體,設計,零件,機構,OBJ,3MF,STEP,IGES,GLB,USDZ,AR,掃描,檔案

**描述：**
OmniSeam 3D 直接在你的裝置上檢查、修復與轉換 3D 模型。

裝置端處理（可離線）
• 從「檔案」或任何 App 的分享面板開啟 STL、OBJ、3MF、PLY、OFF、GLB/glTF 與 Faceted STEP
• 健康報告：破洞、非流形邊、退化面、體積、表面積、外框尺寸
• 修復：焊接頂點、統一法向量、補洞、移除退化三角形
• 在 STL、OBJ、3MF、GLB 等格式間轉換，並存到「檔案」、AirDrop 或切片軟體
• 剖面、距離量測、線框、法向量與 X 光檢視
• 透過 AR Quick Look 把模型放進你的空間

可選的雲端節點
參數化 STEP/IGES 與原生 CAD/BIM 檔（相容 SolidWorks、Inventor、Rhino、IFC、DWG 檔案）需要處理節點。可使用免費的公用示範節點（25 MB 以下，1 小時內刪除），或在 Hugging Face 免費建立自己的節點。上傳前 App 一定會先徵求你的同意。

隱私
不需帳號、沒有廣告、沒有分析或追蹤。本地模式不會把檔案傳送到任何地方。

內建三個範例模型，不需自己的檔案也能完整體驗。支援 English、繁體中文、简体中文、日本語、한국어、ไทย。

---

## 简体中文

**名称：** OmniSeam 3D：STL 模型修复
**副标题：** 3D 转换、查看与打印破面修补
**推广文本：** 直接在 iPhone 与 iPad 上打开、检查、修复与转换 3D 模型。无需账号、无需上传；只有在你选择时才使用云端处理原生 CAD。
**关键词：** 3D打印,网格,水密,补洞,切片,转换器,查看器,CAD,工程,建模,实体,设计,零件,机构,OBJ,3MF,STEP,IGES,GLB,USDZ,AR,扫描,文件

**描述：** （翻译自繁體中文版本，结构相同）
OmniSeam 3D 直接在你的设备上检查、修复与转换 3D 模型。
设备端处理（可离线）：打开 STL、OBJ、3MF、PLY、OFF、GLB/glTF 与 Faceted STEP；健康报告（破洞、非流形边、退化面、体积、表面积）；修复（焊接顶点、统一法向量、补洞）；格式转换并存到“文件”、AirDrop 或切片软件；剖面、测距、线框、X 光视图；AR Quick Look。
可选的云端节点：参数化 STEP/IGES 与原生 CAD/BIM 文件（兼容 SolidWorks、Inventor、Rhino、IFC、DWG 文件）需要处理节点。可使用免费公共演示节点（25 MB 以下，1 小时内删除），或在 Hugging Face 免费创建自己的节点。上传前一定先征求你的同意。
隐私：无需账号、无广告、无分析或追踪。内置三个示例模型。

---

## 日本語

**名前：** OmniSeam 3D：STL修復・変換
**サブタイトル：** 3Dモデルビューア＆3Dプリント補修
**プロモーションテキスト：** iPhone と iPad 上で 3D モデルを開いて検査・修復・変換。アカウント不要、アップロード不要。ネイティブ CAD のクラウド処理は選んだ時だけ。
**キーワード：** メッシュ,穴埋め,修正,コンバーター,スライサー,造形,プリンター,CAD,設計,OBJ,3MF,STEP,IGES,GLB,USDZ,AR,スキャン,ファイル

**説明：**
OmniSeam 3D は端末上で 3D モデルを検査・修復・変換します。
端末上で処理（オフライン対応）：STL、OBJ、3MF、PLY、OFF、GLB/glTF、Faceted STEP を「ファイル」や共有シートから開く／穴・非多様体エッジ・縮退面・体積のヘルスレポート／頂点結合・法線統一・穴埋め／各形式へ変換して「ファイル」・AirDrop・スライサーへ保存／断面・距離計測・ワイヤーフレーム・X 線表示／AR Quick Look。
任意のクラウドノード：パラメトリック STEP/IGES やネイティブ CAD/BIM ファイル（SolidWorks、Inventor、Rhino、IFC、DWG ファイルに対応）は処理ノードが必要です。無料の公開デモノード（25 MB まで、1 時間以内に削除）または Hugging Face で無料の専用ノードを作成できます。アップロード前に必ず確認します。
プライバシー：アカウント・広告・分析・トラッキングなし。サンプルモデル 3 点を同梱。

---

## 한국어

**이름:** OmniSeam 3D: STL 모델 복구
**부제:** 3D 파일 변환·뷰어·3D 프린팅 수리
**프로모션 텍스트:** iPhone과 iPad에서 3D 모델을 열고 검사·복구·변환하세요. 계정도 업로드도 필요 없습니다. 네이티브 CAD 클라우드 처리는 선택할 때만.
**키워드:** 메시,구멍,수정,변환기,슬라이서,출력,프린터,CAD,설계,모델링,OBJ,3MF,STEP,IGES,GLB,USDZ,AR,스캔

**설명:**
OmniSeam 3D는 기기에서 직접 3D 모델을 검사·복구·변환합니다.
기기 내 처리(오프라인): 파일 앱이나 공유 시트에서 STL, OBJ, 3MF, PLY, OFF, GLB/glTF, Faceted STEP 열기 / 구멍·비다양체 엣지·퇴화 면·부피 상태 보고서 / 정점 병합·법선 통일·구멍 메우기 / 형식 변환 후 파일 앱·AirDrop·슬라이서로 저장 / 단면·거리 측정·와이어프레임·X-ray 보기 / AR Quick Look.
선택형 클라우드 노드: 파라메트릭 STEP/IGES 및 네이티브 CAD/BIM 파일(SolidWorks, Inventor, Rhino, IFC, DWG 파일 호환)은 처리 노드가 필요합니다. 무료 공개 데모 노드(25MB 이하, 1시간 이내 삭제) 또는 Hugging Face에서 무료 전용 노드를 만들 수 있습니다. 업로드 전에 항상 동의를 묻습니다.
개인정보: 계정·광고·분석·추적 없음. 샘플 모델 3개 포함.

---

## ไทย

**ชื่อ:** OmniSeam 3D: ซ่อมไฟล์ STL
**คำบรรยายรอง:** แปลงและดูโมเดล 3D พิมพ์ 3 มิติ
**ข้อความโปรโมต:** เปิด ตรวจสอบ ซ่อม และแปลงโมเดล 3D บน iPhone และ iPad ได้ทันที ไม่ต้องมีบัญชี ไม่ต้องอัปโหลด ใช้คลาวด์กับไฟล์ CAD เมื่อคุณเลือกเท่านั้น
**คำค้นหา:** obj,3mf,step,iges,glb,usdz,cad,mesh,ar,ตัวแปลง,สไลเซอร์,เครื่องพิมพ์,อุดรู,แก้ไข,ออกแบบ,สแกน

**คำอธิบาย:**
OmniSeam 3D ตรวจสอบ ซ่อม และแปลงโมเดล 3D บนอุปกรณ์ของคุณโดยตรง
ประมวลผลบนอุปกรณ์ (ออฟไลน์): เปิด STL, OBJ, 3MF, PLY, OFF, GLB/glTF และ Faceted STEP จากแอปไฟล์หรือแผ่นแชร์ / รายงานสุขภาพโมเดล: รู ขอบ non-manifold หน้าเสื่อม ปริมาตร / ซ่อม: รวมจุดยอด แก้ normal อุดรู / แปลงรูปแบบแล้วบันทึกไปยังไฟล์ AirDrop หรือสไลเซอร์ / ระนาบตัด วัดระยะ wireframe X-ray / AR Quick Look
โหนดคลาวด์ (ไม่บังคับ): ไฟล์ STEP/IGES แบบพาราเมตริกและ CAD/BIM ดั้งเดิม (รองรับไฟล์ SolidWorks, Inventor, Rhino, IFC, DWG) ต้องใช้โหนดประมวลผล ใช้โหนดสาธิตสาธารณะฟรี (ไม่เกิน 25 MB ลบภายใน 1 ชั่วโมง) หรือสร้างโหนดฟรีของคุณเองบน Hugging Face แอปจะขอความยินยอมก่อนอัปโหลดทุกครั้ง
ความเป็นส่วนตัว: ไม่มีบัญชี โฆษณา การวิเคราะห์ หรือการติดตาม มีโมเดลตัวอย่าง 3 รายการ

---

## ASO strategy (App Store Optimization)

Only three text fields are indexed for App Store search on iOS: **App Name (30)**, **Subtitle (30)** and **Keywords (100)**.
The description and promotional text are **not** indexed (they matter for conversion, not ranking).

Rules applied to every locale above:
1. **Highest-value term in the name.** "STL" + "repair/修復" is the core search intent (3D printing users fixing broken meshes). Name keywords carry the most ranking weight.
2. **Subtitle covers the second intent** (converter / viewer / 3D printing) with words *not* already in the name.
3. **No duplicates across fields.** Apple combines words from name + subtitle + keywords (e.g. "stl" + "converter" → "stl converter"), so repeating a word wastes characters.
4. **Keywords: comma-separated, no spaces, singular forms**, no brand/trademark names (SolidWorks, Fusion, Cura… are excluded — Guideline 2.3.7), no category names ("productivity") and no "app"/"free".
5. **File-format tokens** (obj, 3mf, step, iges, glb, gltf, usdz, ply) capture high-intent searches such as "step to stl" and "3mf viewer".
6. **CJK locales** use compound search terms people actually type (3D列印, 補洞, 3Dプリント, 3D 프린팅) and keep Latin format tokens, since users search both.

| Locale | Name | Subtitle | Keywords |
|---|---|---|---|
| en-US | 28/30 | 27/30 | 98/100 |
| zh-Hant | 20/30 | 15/30 | 82/100 |
| zh-Hans | 20/30 | 15/30 | 82/100 |
| ja | 20/30 | 18/30 | 80/100 |
| ko | 22/30 | 21/30 | 68/100 |
| th | 25/30 | 30/30 | 92/100 |

### Beyond text
- **First three screenshots decide conversion.** Put a short benefit caption at the top of each (same order in every locale):
  1. en "Fix broken STL meshes" · 繁中「一鍵修復 STL 破面」· 简中「一键修复 STL 破面」· ja「STLの穴を自動修復」· ko「STL 구멍 자동 수리」· th「ซ่อมไฟล์ STL อัตโนมัติ」
  2. en "Convert STEP, OBJ, 3MF, GLB" · 繁中「STEP、OBJ、3MF、GLB 互轉」· …
  3. en "Works offline · no account" · 繁中「離線可用・免註冊」· …
  4. en "See it in your room with AR" · 繁中「AR 放進真實空間」· …
- **Ratings drive ranking.** The app asks for an App Store rating (Apple's system prompt, max 3×/year) after the 3rd successful conversion — never during a task or after an error.
- **Promotional text** (170 chars, not indexed) can be changed anytime without review: use it for seasonal messages.
- **Review the keywords monthly** in App Store Connect → Analytics (Sources → App Store Search); swap terms with no impressions for new ones in the next version.
- Keep the web page title/description (SEO) aligned with the same core terms: "STL repair", "3D model converter", "watertight mesh".

---

## Screenshots

Required sizes: iPhone 6.9" (1320 × 2868) and iPad 13" (2064 × 2752). Drafts captured from the simulator are in `docs/app-store/screenshots/`. Recommended final set per language (3–5 each):

1. Holey-box sample with red hole markers + health report
2. Before/after split view after repair
3. Export → Share sheet ("Save to Files")
4. AR Quick Look on a real device (simulator cannot show AR)
5. Node settings showing the free, optional cloud node
