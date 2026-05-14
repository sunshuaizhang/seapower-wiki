# Sea Power · 离线百科

实时读取 *Sea Power* 游戏 `StreamingAssets` 目录的本地百科站,无需打开游戏即可浏览舰艇、飞机、陆战单位与武器弹药。前后端分离:Spring Boot 3 / JDK 21 提供 API,React 19 / TypeScript / Vite 提供页面。

- ✅ 4 大分类:vessels(220) / aircraft(103) / land_units(175) / ammunition(323)
- ✅ 9 种语言(en/cn/ru/de/fr/es/ja/ko/vn)
- ✅ **实时读取 INI**,游戏更新后刷新页面即可,无需重新生成 JSON
- ✅ 文件 mtime 缓存,性能与实时两不误
- ✅ 武器表点击弹药可弹窗查看百科卡片
- ✅ **实时从 Unity 资源抽取贴图**(涂装/舷号/徽章/国旗),懒加载 + 磁盘缓存

## 关于 Sea Power

**[Sea Power: Naval Combat in the Missile Age](https://store.steampowered.com/app/1286220/Sea_Power__Naval_Combat_in_the_Missile_Age/)** 是 *Cold Waters* 首席设计师领衔打造的现代海战模拟游戏,目前在 Steam 上 Early Access。玩家指挥北约或华约阵营的海上力量,从近距离的 Boghammar 快艇对射,到长程导弹突防、舰载反潜,覆盖冷战至现代的真实装备体系。

- 🛳 **200+** 舰艇/潜艇(原始舰种与改装变体)
- ✈️ **100+** 固定翼/旋翼机
- 🚀 **150+** 武器系统(导弹、鱼雷、舰炮、电子对抗)
- 🎯 **100+** 陆战与岸基目标

这个项目就是给买了游戏的玩家(以及 modder)用的 —— 把游戏自带的 `StreamingAssets/original/` 那堆 INI 直接渲染成"军事百科风"的可浏览界面,不需要把游戏跑起来。Mod 自己加的舰种/弹药也会被自动识别。

## 架构

```
┌──────────────────────┐         ┌───────────────────────────┐
│  React 19 + Vite     │         │  Spring Boot 3 / JDK 21   │
│  frontend/  :5173    │ ──/api──▶  /api/**                  │
│  (开发) / 静态部署    │   CORS  │  src/main/java            │
└──────────────────────┘         └───────────────────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────────┐
                                  │  Python 子进程 (UnityPy) │
                                  │  scripts/unity_extractor │
                                  └──────────────────────────┘
                                              │
                                              ▼
                                  Sea Power StreamingAssets/
                                  resources.assets / *.assets
```

- **dev**:Vite 在 5173 通过 `proxy` 把 `/api/*` 转发到 8080,浏览器视角同源,无 CORS。
- **prod**:前端构建产物可单独部署到任何静态托管,后端独立部署。前端通过 `VITE_API_BASE` 指到后端域名;后端通过 `app.cors.allowed-origins` 放行前端 origin。

## 快速开始

### 1. 依赖

| 组件 | 版本 |
|---|---|
| JDK | 21 + Maven 3.9+ |
| Node | 20+(自带 npm) |
| Python | 3.10+ —— 仅当 `images.enabled=true`(默认开)时需要 |

Python 一次性装包:
```bash
python -m pip install UnityPy Pillow
```
不想要图片功能,把 `application.yml` 里 `images.enabled` 改成 `false` 即可跳过 Python 依赖。

### 2. 确认游戏路径

`src/main/resources/application.yml` 默认指向:
```
D:/SteamLibrary/steamapps/common/Sea Power/Sea Power_Data/StreamingAssets
```
Steam 库不在这,修改 `game.streaming-assets` 和 `game.data-dir`。

### 3. 装前端依赖(一次)

```bash
npm --prefix frontend install
```

### 4. 起两个进程

```bash
# 终端 1 —— 后端
mvn spring-boot:run
# 启动后 Unity 贴图守护进程在 ~2 秒内异步索引 8800+ 张纹理

# 终端 2 —— 前端
npm --prefix frontend run dev
```

浏览器打开 **http://localhost:5173/** 即可使用。

### 5. 打包生产产物(可选)

```bash
# 后端 jar
mvn -DskipTests package
java -jar target/sea-power-wiki-1.0.0.jar

# 前端 dist —— 完全分离部署时
VITE_API_BASE=https://your-backend.example.com npm --prefix frontend run build
# 把 frontend/dist/* 放到任何静态托管(Nginx / Vercel / 对象存储)
```

不设 `VITE_API_BASE` 时,前端打包默认走相对路径 `/api/*`,适用于"前端反代到后端"的同域部署场景。

## 配置项

### 后端 `application.yml`

| 项 | 默认 | 说明 |
|---|---|---|
| `server.port` | 8080 | 后端端口 |
| `game.streaming-assets` | (Steam 路径) | 游戏 StreamingAssets 绝对路径 |
| `game.data-dir` | (Steam 路径) | 游戏 Sea Power_Data 绝对路径(读 `.assets`) |
| `game.default-language` | cn | 缺省语言 |
| `game.cache-enabled` | true | 文件 mtime 缓存(调试 mod 时设 false) |
| `images.enabled` | true | 关掉就完全不依赖 Python |
| `images.python-bin` | python | Python 可执行文件 |
| `images.cache-dir` | `${user.dir}/cache/images` | 解码后的 PNG 落盘目录 |
| `app.cors.allowed-origins` | `http://localhost:5173,http://localhost:3000` | 允许跨域调用 `/api/**` 的 origin,逗号分隔 |

### 前端环境变量

| 变量 | 用途 |
|---|---|
| `VITE_API_BASE` | 生产构建时指向后端的绝对地址(如 `https://api.example.com`)。dev 留空,走 Vite 代理 |

## REST API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/meta` | 服务元信息(语言列表 / 默认语言 / StreamingAssets 路径) |
| GET | `/api/nations` | 国家前缀映射 |
| GET | `/api/vessels?lang=cn` | 舰艇列表 |
| GET | `/api/aircraft?lang=cn` | 飞机列表 |
| GET | `/api/land_units?lang=cn` | 陆战单位列表 |
| GET | `/api/ammunition?lang=cn` | 弹药列表 |
| GET | `/api/vessel/{id}?lang=cn` | 舰艇详情 |
| GET | `/api/aircraft/{id}?lang=cn` | 飞机详情 |
| GET | `/api/land_unit/{id}?lang=cn` | 陆战单位详情 |
| GET | `/api/ammo/{id}?lang=cn` | 弹药详情 |
| GET | `/api/image/status` | 贴图抽取守护进程状态 |
| GET | `/api/image/{name}.png` | 按贴图名取 PNG(懒抽取 + 缓存) |

## 项目结构

```
sea-power-wiki/
├─ pom.xml
├─ src/main/java/com/seapower/wiki/
│  ├─ WikiApplication.java            启动类
│  ├─ config/
│  │  ├─ GameConfig.java              游戏路径配置绑定
│  │  ├─ ImageConfig.java             贴图守护进程配置绑定
│  │  └─ CorsConfig.java              跨域配置(分离部署)
│  ├─ parser/
│  │  ├─ IniDocument.java             INI 结构体
│  │  └─ IniParser.java               自定义解析器(// # 注释 / BOM / 装饰 section)
│  ├─ model/                          UnitSummary / UnitDetail / AmmunitionDetail
│  ├─ service/
│  │  ├─ FileCache.java               mtime 缓存
│  │  ├─ NationService.java           国家前缀解析
│  │  ├─ LanguageService.java         9 种语言文本 + \n 反转义
│  │  ├─ UnitService.java             舰/机/陆战装配
│  │  ├─ AmmunitionService.java       弹药装配
│  │  ├─ UnityExtractorService.java   Python 子进程管理
│  │  └─ ImageService.java            PNG 缓存查询
│  └─ controller/
│     ├─ WikiController.java          百科 REST 接口
│     └─ ImageController.java         贴图 REST 接口
├─ src/main/resources/
│  └─ application.yml
├─ frontend/                          React 19 + TS + Vite 前端
│  ├─ vite.config.ts                  含 /api → :8080 代理
│  ├─ index.html
│  └─ src/
│     ├─ App.tsx                      顶层组合
│     ├─ types.ts                     与 Java DTO 对齐
│     ├─ api.ts                       fetch 封装,带 VITE_API_BASE 前缀
│     ├─ constants.ts                 spec 标签 / 旗帜映射 / slot 本地化
│     ├─ utils/format.ts              formatRaw / formatServiceDate / specFrom
│     ├─ state/                       Context + Provider + useApp hook
│     └─ components/                  Topbar / Sidebar / Detail / Hero / StatsStrip
│                                     Armament / Sensors / Variants / AirGroup
│                                     FullSpecs / RawDump / AmmoLink / AmmoPopover
├─ scripts/unity_extractor.py        常驻 Python 守护进程,stdin/stdout JSON 协议
└─ cache/images/                     抽取后的 PNG 落盘(运行时生成)
```

## 数据覆盖

以提康德罗加级(CG-47)为例,从 INI 提取的字段:

- **基础**:名称(中英)、舰级描述、类型、国家、舷号
- **物理**:长 173 m / 宽 16.8 m / 满载 9600 t / 最大 32 节
- **动力**:燃气轮机 80000 hp
- **信号特征**:RCS/IR 大、基本噪声 155 dB
- **AI 评分**:AAW 9 / ASuW 7 / ASW 7
- **传感器**:SPY-1A / SPS-49 / SPS-55 / SPG-62×4 / SPQ-9 / SQS-53B / SLQ-32
- **武器**:MK26×2 / MK141 Harpoon / MK45 5" 炮×2 / MK32 鱼雷×2 / MK15 CIWS×2 / 诱饵 / 干扰弹
- **弹库**:SM-1(RIM-66C)×68 / ASROC(RUR-5)×20 / Harpoon / MK46×16 / 127mm×1200 / 20mm×20000
- **变体**:CG-47 Ticonderoga / CG-48 Yorktown / CG-49 Vincennes / CG-50 Valley Forge(含服役年份)
- **机库**:SH-2F×2

武器表里点击任意弹药 ID,会弹出该弹药的百科卡片(名称 / 代号 / 类别 / 描述 / 战斗部 / 制导)。

## 实时读取机制

### INI 部分
每次请求都会:
1. 对目标 INI 文件 `Files.getLastModifiedTime()`
2. 若与缓存时间一致 → 返回缓存结果
3. 否则重新解析并更新缓存

**游戏打补丁或你编辑 mod 后,下次 API 请求即生效**,不重启服务、不重建 JSON。强制每次重解析:`game.cache-enabled: false`。

### 图片部分
启动时 Java 拉起一个常驻 Python 子进程(`scripts/unity_extractor.py`),用 UnityPy 打开 `resources.assets` 等 5 个 `.assets` 文件,建立 `texture_name → object` 索引(~2 秒、8800+ 条)。

每次 `/api/image/{name}.png` 请求:
1. 检查 `cache/images/<name>.png` 是否存在,且 mtime 比 `resources.assets` 新
2. 是 → 直接返回(<50 ms)
3. 否 → 通过 stdin JSON 请求守护进程 → UnityPy 解码 PNG → 落盘 → 返回(100 ms ~ 1 s)

**游戏更新 → `resources.assets` mtime 变 → 所有缓存 PNG 自动失效 → 下次访问重抽**。
关闭服务或浏览器后,已缓存的 PNG 保留在磁盘,下次秒开。

### 典型耗时(实测)

| 操作 | 耗时 |
|---|---|
| 冷抽取国旗(128×128) | ~300 ms(首次含进程预热) |
| 冷抽取舷号(128×128) | ~100 ms |
| 冷抽取徽章(256×256) | ~100-200 ms |
| 冷抽取涂装(1024×1024) | ~900 ms |
| 任意热命中 | 30-60 ms(纯 HTTP/文件 IO) |

## 脚本

```
scripts/unity_extractor.py   常驻 Python 守护进程,stdin/stdout JSON 协议
```

可单独调试:
```bash
echo '{"cmd":"extract","name":"flag_us","out":"/tmp/flag.png"}
{"cmd":"shutdown"}' | python scripts/unity_extractor.py "D:/SteamLibrary/steamapps/common/Sea Power/Sea Power_Data"
```

