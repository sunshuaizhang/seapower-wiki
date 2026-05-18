# Sea Power · 离线百科

实时读取 *Sea Power* 游戏 `StreamingAssets` 目录的本地百科站，无需打开游戏即可浏览**单位、武器、任务、战役**。前后端分离：Spring Boot 3 / JDK 21 提供 API，React 19 / TypeScript / Vite 提供页面。

- ✅ **两大领域 · 六个类目**：单位百科（舰艇/飞机/陆战/弹药）+ 作战行动（任务/战役）
- ✅ **实时读取 INI**，游戏更新或装 mod 后刷新即看新数据，无需重建 JSON
- ✅ **Unity 资源实时解码**——涂装/舷号/徽章/国旗按需抽取 + 磁盘缓存
- ✅ **任务详情**：简报 XAML 网格原版还原 · 战斗序列编队 · 目标 ROE 清单 · 反向地理编码
- ✅ **战役详情**：线性任务时间线（带 4A/4B 分支）· 桑盒港口分组编成 · 友方国家盘点
- ✅ **可点弹药/单位 chip 弹层预览**，「打开完整页」一键新窗口深链
- ✅ **2K 优化排版**，最低 1080p，配色军事百科风
- ✅ **9 种语言**自动 fallback（en/cn/ru/de/fr/es/ja/ko/vn）

## 关于 Sea Power

**[Sea Power: Naval Combat in the Missile Age](https://store.steampowered.com/app/1286220/Sea_Power__Naval_Combat_in_the_Missile_Age/)** 是 *Cold Waters* 首席设计师领衔打造的现代海战模拟游戏，目前在 Steam 上 Early Access。玩家指挥北约或华约阵营的海上力量，从近距离的 Boghammar 快艇对射，到长程导弹突防、舰载反潜，覆盖冷战至现代的真实装备体系。

- 🛳 **200+** 舰艇/潜艇（原始舰种与改装变体）
- ✈️ **100+** 固定翼/旋翼机
- 🚀 **300+** 武器系统（导弹、鱼雷、舰炮、电子对抗）
- 🎯 **100+** 陆战与岸基目标
- 📜 **70+** 单关任务 + **数个** 线性/桑盒战役

这个项目就是给买了游戏的玩家（以及 modder）用的——把游戏自带的 `StreamingAssets/original/` 那堆 INI/XAML 直接渲染成"军事百科+作战档案风"的可浏览界面。Mod 自加的舰种/弹药/任务也会自动识别。

## 架构

```
┌──────────────────────┐                  ┌───────────────────────────┐
│  React 19 + Vite     │                  │  Spring Boot 3 / JDK 21   │
│  frontend/  :5173    │ ──── /api/* ────▶│  src/main/java :8080      │
│  Hash routing        │       CORS       │  10+ services             │
└──────────────────────┘                  └───────────────────────────┘
                                                      │
                                  ┌───────────────────┼──────────────────┐
                                  ▼                   ▼                  ▼
                       ┌──────────────────┐   ┌──────────────┐  ┌─────────────────────┐
                       │ INI / XAML       │   │ 直读 PNG     │  │ Python 子进程       │
                       │ (Mission /       │   │ (briefing    │  │ scripts/            │
                       │  Campaign /      │   │  maps,       │  │ unity_extractor.py  │
                       │  Unit / Ammo)    │   │  art)        │  │ UnityPy             │
                       └──────────────────┘   └──────────────┘  └─────────────────────┘
                                  │                   │                  │
                                  └────────┬──────────┘──────────────────┘
                                           ▼
                            Sea Power StreamingAssets/original/
                            + Sea Power_Data/resources.assets
```

- **dev**：Vite 在 5173 通过 `proxy` 把 `/api/*` 转发到 8080，同源无 CORS
- **prod**：前端构建产物可独立静态托管，后端独立部署。前端通过 `VITE_API_BASE` 指到后端域名；后端通过 `app.cors.allowed-origins` 放行前端 origin

## 快速开始

### 1. 依赖

| 组件 | 版本 |
|---|---|
| JDK | 21 + Maven 3.9+ |
| Node | 20+ |
| Python | 3.10+ —— 仅当 `images.enabled=true`（默认开）时需要 |

Python 一次性装包：
```bash
python -m pip install UnityPy Pillow
```
不要图片功能：把 `application.yml` 里 `images.enabled` 改 `false` 即可跳过 Python 依赖。

### 2. 确认游戏路径

`src/main/resources/application.yml` 默认指向：
```
D:/SteamLibrary/steamapps/common/Sea Power/Sea Power_Data/StreamingAssets
```
Steam 库不在这，改 `game.streaming-assets` 和 `game.data-dir`。

### 3. 装前端依赖（一次）

```bash
npm --prefix frontend install
```

### 4. 启动

```bash
# 终端 1 —— 后端
mvn spring-boot:run
# 启动后 Unity 贴图守护进程在 ~2 秒内异步索引 8800+ 张纹理

# 终端 2 —— 前端
npm --prefix frontend run dev
```

浏览器打开 **http://localhost:5173/** 即可。

### 5. 打包生产产物（可选）

```bash
# 后端 jar
mvn -DskipTests package
java -jar target/sea-power-wiki-1.0.0.jar

# 前端 dist（完全分离部署）
VITE_API_BASE=https://your-backend.example.com npm --prefix frontend run build
# frontend/dist/* → 任何静态托管（Nginx / Vercel / 对象存储）
```

不设 `VITE_API_BASE` 时，前端走相对路径 `/api/*`，适合"前端反代到后端"的同域部署。

## 使用指南

### 导航：两级 domain × 子类目

```
┌─单位百科─┬─作战行动─┐
│  舰艇    │  任务     │
│  飞机    │  战役     │
│  陆战    │           │
│  弹药    │           │
└─────────┴───────────┘
```

点击左侧 domain 切换大领域，下方子 cat-tabs 跟着变（4 或 2 个）。Topbar 实时显示「类目 飞机 [220]」面包屑。

### 列表交互

- **国家手风琴**：所有列表都按国家分组，同时只允许一个国家展开（点别的自动收起）
- **战役组默认展开**（只有 2 条不藏）
- **选中所在国家**永远高亮，即使折叠后也能在国家 header 看到金色圆点
- **舰艇 badge 按类别配色**：FF/DD 红、SSN 蓝、CV 金、PT 绿、辅助灰

### 详情交互

- **武装系统 popover**：弹药 chip 点击 → 弹层显示弹药百科卡片（图、关键 stat、描述）
- **战斗序列 popover**：任务/战役内 OOB 的舰艇 chip 点击 → 弹层显示舰艇缩略（图 + 关键 stat + 描述 + 「打开完整页 →」按钮）
- **打开完整页**：在新 tab 用 URL hash 深链直接载入对应单位/弹药完整详情，不破坏当前任务/战役浏览语境
- **DateBased 弹药**：F-14 等使用年代切换挂载的飞机，每个 station 行旁有 📅 图标，hover 显示完整年代→弹药时间线
- **简报 XAML 还原**：任务详情的「电传报文」段按原版 WPF Grid 网格定位，左列发件人/收件人/抄送，右列正文，复现游戏内电传纸视觉
- **任务时间线展开**：战役内每个任务节点都展开显示完整描述 + 目标列表 + OOB

### 深链 / 多窗口

URL hash 格式：`#<category>:<encoded-id>`，可直接复制粘贴分享。
```
#vessels:usn_cv_forrestal_75
#aircraft:usn_f-14a
#missions:NATO/Action%20in%20the%20Gulf%20of%20Sidra%201986
#campaigns:linear-campaign-proto-1
```

点击右上角顶栏品牌 `⚓ SEA POWER` 回首页（hash 清空）。

### 键盘 / 无障碍

- 列表行、tabs、popover、关闭按钮均为可聚焦的原生 `<button>`
- popover：**Esc** 关闭 / 点外部关闭 / 右上角 **×** 关闭
- 缩略类型标签旁的 `?` 圆圈鼠标悬浮显示完整释义（AAW = Anti-Air Warfare / DDG = Guided Missile Destroyer / Fighter = 战斗机 / SAM = Surface-to-Air Missile / 等等）

## 配置项

### 后端 `application.yml`

| 项 | 默认 | 说明 |
|---|---|---|
| `server.port` | 8080 | 后端端口 |
| `game.streaming-assets` | (Steam 路径) | 游戏 StreamingAssets 绝对路径 |
| `game.data-dir` | (Steam 路径) | 游戏 Sea Power_Data 绝对路径（读 `.assets`）|
| `game.default-language` | cn | 缺省语言，找不到时 fallback 到 en |
| `game.cache-enabled` | true | INI 文件 mtime 缓存（调试 mod 时设 false）|
| `images.enabled` | true | 关掉就完全不依赖 Python |
| `images.python-bin` | python | Python 可执行文件 |
| `images.cache-dir` | `${user.dir}/cache/images` | 解码后的 PNG 落盘目录 |
| `app.cors.allowed-origins` | `http://localhost:5173,http://localhost:3000` | 允许跨域调 `/api/**` 的 origin，逗号分隔 |

### 前端环境变量

| 变量 | 用途 |
|---|---|
| `VITE_API_BASE` | 生产构建时指向后端绝对地址（如 `https://api.example.com`）；dev 留空走 Vite 代理 |

## REST API

### 元信息

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/meta` | 服务元 + **游戏版本**（从 `changelog.txt` 解析）|
| GET | `/api/nations` | 国家前缀 → 翻译 映射 |

### 单位百科

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/vessels?lang=cn` | 舰艇列表 |
| GET | `/api/aircraft?lang=cn` | 飞机列表 |
| GET | `/api/land_units?lang=cn` | 陆战单位列表 |
| GET | `/api/ammunition?lang=cn` | 弹药列表 |
| GET | `/api/vessel/{id}?lang=cn` | 舰艇详情 |
| GET | `/api/aircraft/{id}?lang=cn` | 飞机详情 |
| GET | `/api/land_unit/{id}?lang=cn` | 陆战单位详情 |
| GET | `/api/ammo/{id}?lang=cn` | 弹药详情 |

### 作战行动

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/missions?lang=cn` | 全部任务列表（按势力分组）|
| GET | `/api/mission/{folder}/{id}?lang=cn` | 任务详情（含简报 XAML + OOB + 目标）|
| GET | `/api/campaigns?lang=cn` | 战役列表 |
| GET | `/api/campaign/{id}?lang=cn` | 战役详情（含任务时间线 + 港口编成）|

### 静态资源

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/image/status` | Unity 贴图守护进程状态 |
| GET | `/api/image/{name}.png` | 按贴图名取 PNG（懒抽取 + 缓存）|
| GET | `/api/asset/**` | 直读 `StreamingAssets/original/` 下任意图（简报地图、战役立绘）|

## 项目结构

```
sea-power-wiki/
├─ pom.xml
├─ src/main/java/com/seapower/wiki/
│  ├─ WikiApplication.java
│  ├─ config/                            (GameConfig / ImageConfig / CorsConfig)
│  ├─ parser/                            IniParser + IniDocument（自定义注释 / BOM / 装饰 section）
│  ├─ model/                             记录类型 DTO
│  │  ├─ UnitSummary / UnitDetail        舰/机/陆 数据模型（含 WeaponMount / Sensor / Magazine / Variant）
│  │  ├─ AmmunitionDetail                弹药数据模型
│  │  ├─ MissionSummary / MissionDetail  任务（含 Environment / Side / Formation / Unit / Objective）
│  │  ├─ CampaignSummary / CampaignDetail 战役（含 TimelineMission / PortGroup / Group / UnitRow）
│  │  └─ Briefing                        XAML 解析后的 grid+cells 模型
│  ├─ service/
│  │  ├─ FileCache.java                  mtime 缓存
│  │  ├─ NationService.java              国家 prefix → 翻译，含补充映射
│  │  ├─ LanguageService.java            9 种语言文本 + \n 反转义 + 数值枚举翻译
│  │  ├─ UnitService.java                舰/机/陆 装配，含 DateBased 弹药解析
│  │  ├─ AmmunitionService.java          弹药装配，含 typeOf() 给飞机站位推断武器类型
│  │  ├─ MissionService.java             单任务 INI 解析（环境/编队/单位/目标/简报）
│  │  ├─ CampaignService.java            战役 INI 解析（时间线/编成/盟友）
│  │  ├─ LocationService.java            (lat, lon) → 最近城市/港口反向地理编码
│  │  ├─ BriefingParser.java             XAML → Grid 结构化 DOM 解析
│  │  ├─ UnityExtractorService.java      Python 子进程管理
│  │  └─ ImageService.java               PNG 缓存查询
│  └─ controller/
│     ├─ WikiController.java             单位 + 任务 + 战役 + 元信息 REST
│     ├─ AssetController.java            散文件资源 REST（含路径遍历防护）
│     └─ ImageController.java            Unity 贴图 REST
├─ src/main/resources/
│  └─ application.yml
├─ frontend/                             React 19 + TS + Vite
│  ├─ vite.config.ts                     /api → :8080 代理
│  ├─ index.html
│  └─ src/
│     ├─ App.tsx                         顶层组合 + AmmoPopover/UnitPopover 挂载
│     ├─ types.ts                        与 Java DTO 对齐
│     ├─ api.ts                          fetch 封装 + VITE_API_BASE 前缀
│     ├─ constants.ts                    spec 标签 / hint / 旗帜映射 / 导航 taxonomy
│     ├─ utils/
│     │  ├─ format.ts                    formatNumber / truncate / formatServiceDate
│     │  ├─ url.ts                       parseHash / buildHash / parseMissionId
│     │  ├─ fetchCache.ts                成功缓存 + 错误不缓存的 memoize 工厂
│     │  ├─ difficulty.ts                difficultyStars / clampDifficulty
│     │  └─ useImageLoadState.ts         图片加载失败 hook（src 变更自动重置）
│     ├─ state/                          Context + Provider + useApp hook（hash 路由双向同步）
│     └─ components/                     ~30 个组件
│        ├─ Topbar / Sidebar / Detail / Hero / StatsStrip
│        ├─ Armament / Sensors / Variants / AirGroup / FullSpecs / RawDump
│        ├─ MissionDetailView / MissionBriefing / MissionTimeline / OrderOfBattle
│        ├─ CampaignDetailView / CampaignRoster
│        ├─ AmmoPopover / UnitPopover / ClickPopover（共享 shell）
│        ├─ AmmoLink / Difficulty / LazyImage / Section / UnitListItem
│        └─ AmmoDetailView / UnitDetailView
├─ scripts/unity_extractor.py            常驻 Python 守护，stdin/stdout JSON 协议
└─ cache/images/                         抽取后的 PNG 落盘（运行时生成）
```

## 实时读取机制

### INI / XAML 部分
每次请求都会：
1. 对目标文件 `Files.getLastModifiedTime()`
2. 与缓存时间一致 → 返回缓存结果
3. 否则重新解析并更新缓存

**游戏打补丁或编辑 mod 后，下次 API 请求即生效**，不重启服务、不重建 JSON。强制每次重解析：`game.cache-enabled: false`。

### 图片部分
启动时 Java 拉起一个常驻 Python 子进程，用 UnityPy 打开 `resources.assets` 等 5 个 `.assets` 文件，建立 `texture_name → object` 索引（~2 秒、8800+ 条）。

每次 `/api/image/{name}.png` 请求：
1. 检查 `cache/images/<name>.png` 是否存在，且 mtime 比 `resources.assets` 新
2. 是 → 直接返回（<50 ms）
3. 否 → 通过 stdin JSON 请求守护进程 → UnityPy 解码 PNG → 落盘 → 返回（100 ms ~ 1 s）

**游戏更新 → `resources.assets` mtime 变 → 所有缓存 PNG 自动失效 → 下次访问重抽**。关闭服务或浏览器后，已缓存的 PNG 保留在磁盘，下次秒开。

### 散件资源 `/api/asset/**`
直接读 `StreamingAssets/original/` 下的散件 PNG（简报地图、战役立绘等），不走 Unity 解码，做了路径遍历防护。

### 典型耗时

| 操作 | 耗时 |
|---|---|
| 冷抽取国旗（128×128） | ~300 ms（首次含进程预热）|
| 冷抽取舷号（128×128） | ~100 ms |
| 冷抽取徽章（256×256） | ~100-200 ms |
| 冷抽取涂装（1024×1024） | ~900 ms |
| 任意热命中 | 30-60 ms（纯 HTTP/文件 IO）|
| 单任务详情（含简报 XAML 解析） | ~50-100 ms |
| 战役详情（9 个任务全展开 + OOB） | ~200-400 ms |

## 开发

### 后端

```bash
mvn -DskipTests compile          # 仅编译
mvn -DskipTests spring-boot:run  # 起服务
mvn -DskipTests package          # 打 jar
```

### 前端

```bash
cd frontend
npm run dev          # 起 Vite dev server
npm run build        # 生产构建
npx tsc --noEmit     # 类型检查
npx eslint src       # lint
```

### 行尾规则

仓库自带 `.gitattributes`，所有源码强制 LF，Windows 脚本强制 CRLF，二进制 binary。开发者不需要单独设 `core.autocrlf`。

## 数据覆盖

以提康德罗加级（CG-47）为例，从 INI 提取的字段：

- **基础**：名称（中英）、舰级描述、类型、国家、舷号
- **物理**：长 173 m / 宽 16.8 m / 满载 9600 t / 最大 32 节
- **动力**：燃气轮机 80000 hp
- **信号特征**：RCS/IR 大、基础噪声 155 dB
- **AI 评分**：AAW 9 / ASuW 7 / ASW 7（带英文术语 hint 提示）
- **传感器**：SPY-1A / SPS-49 / SPS-55 / SPG-62×4 / SPQ-9 / SQS-53B / SLQ-32
- **武器**：MK26×2 / MK141 Harpoon / MK45 5" 炮×2 / MK32 鱼雷×2 / MK15 CIWS×2 / 诱饵 / 干扰弹
- **弹库**：SM-1（RIM-66C）×68 / ASROC（RUR-5）×20 / Harpoon / MK46×16 / 127mm×1200 / 20mm×20000
- **变体**：CG-47 Ticonderoga / CG-48 Yorktown / CG-49 Vincennes / CG-50 Valley Forge（含服役年份 + Late 升级套件）
- **机库**：SH-2F×2
- **跨视图联动**：在「锡德拉湾行动 1986」任务的我方 OOB 里点击 Ticonderoga chip → 弹层 → 「打开完整页 →」新 tab 直达上述完整百科

## 许可

源码 MIT。数据归 Triassic Games / MicroProse 所有，本项目仅供购买正版游戏的玩家使用，不分发任何游戏资源。

## 鸣谢

- **Triassic Games / MicroProse** 制作的 *Sea Power*
- **UnityPy** —— Unity 资源解析
- 玩家社区翻译者 —— 9 种语言文本
