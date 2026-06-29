# JobPilot v4 — 项目说明与改动日志

> 本文件由 Claude Code 每次会话自动加载。**文末含「改动日志」,每次改动后必须更新一条。**
> 维护约定:任何对代码 / 数据库 / 配置的改动,完成后在「改动日志」追加一条(日期 + 改了什么 + 为什么)。

## 项目结构
- `backend/` — FastAPI 后端,默认端口 8000
- `frontend/` — Next.js 16 前端,端口 3000
- 前端通过 `frontend/app/api/[...path]/route.ts` 把 `/api/*` 代理到后端 `BACKEND_URL`(默认 `http://localhost:8000`)
- `start-all.bat` — 一键启动前后端

## 启动
1. 后端:`cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
2. 前端:`cd frontend && npm run dev`
3. 浏览器访问 http://localhost:3000

## 数据库
- **正式数据在 Supabase 云端 PostgreSQL(17)**,连接串配在 `backend/.env` 的 `DATABASE_URL`(经 `core/config.py` 的 `settings.database_url` 读取;`database.py` 据此判断走云端还是本地)
- 双模式:`DATABASE_URL` 以 `postgres` 开头 → 云端 Postgres;为空 → 回退本地 SQLite
- 建表幂等:后端启动时 `init_db()` 自动建表 / 补列;Postgres 查询结果用 `_Row` 同时兼容列名与位置索引(`row['c']` 与 `row[0]`)
- 本地 `backend/data/jobpilot.db` 保留为兜底(连接串失效时自动启用),正式数据以云端为准

## 运维红线(踩过的坑)
- **停后端优先用 `Ctrl+C` 优雅关闭**:数据库已改为 rollback journal 模式(非 WAL)+ 每次启动自动备份,强杀不再丢失已提交数据(2026-06-23 曾因 WAL+强杀丢过一次,现已根治)。备份位于 `backend/data/backups/`。
- 改动数据库前先备份。
- 本机可能存在多个项目副本(jobpilot-v2 / v4),操作前先确认后端连的是哪个目录 / 哪个库,避免连错。

## 遗留组件(暂不启用,勿当死代码删除)

`frontend/app/page.tsx` 中以下组件来自**上一版本**,**已定义但当前未在首页渲染**,是**有意保留**,不是死代码,请勿删除:
- `FunnelSection` — 求职漏斗进度条(内含 `JobCat` 求职小猫 SVG,各阶段形象)
- `JobCalendar` — 首页求职日历(带投递 / 自定义事件标记)

**为什么暂不启用**:直接加回首页会让信息过载、视觉混乱,且当前呈现未达预期。
**未来若启用**:必须先做整体布局与视觉规划再接入,不要简单堆叠;在那之前保持未渲染状态。

## 改动日志

### 2026-06-29(晚)
- **首页求职日历改为记事本式 + 修复无法删除**:`page.tsx` 的 `HomeCalendar` 原本底部是「＋面试 / ＋AI测评」两个**预设标签按钮**(点一下直接塞一个 title=标签名的事件),且每条事件**没有删除入口**(父组件 `handleDeleteCustomEvent` 已存在却没传进组件)。现改为:① 底部一个**文本输入框 + 添加按钮**(回车也可提交),直接写自由日程内容(如「字节一面 14:00」),type 统一存「日程」;② 每条事件前加圆点、显示 title 全文,hover 出现 × 删除按钮(接到 `onDelete`→`handleDeleteCustomEvent`→`api.calendar.delete`)。删了无用的 `tagCls`。后端 `custom_calendar_events` CRUD 未动(create/delete 实测正常)。旧的 4 条 面试/AI测评 标签数据(2026-06-25)会以其 title 文本显示,可用新的 × 删除。**注**:`/calendar` 整页(`app/calendar/page.tsx`)的添加弹窗仍保留 类型下拉(面试/截止/备考/其他),本次只改首页卡;如也要改成记事本式可再提。

### 2026-06-29(下午)
- **卡内配色重构为大地色系(消除冲突)**:首页各卡片内原本的高饱和 Tailwind 色(indigo/emerald/amber/red/sky -500)与墨绿色卡打架,统一换成**低饱和大地色**:能力胶囊领域色(方向 #2E5B54 墨绿 / 方法 #5E7E52 橄榄 / 行业 #B07A52 陶土 / 工具 #5B7E86 灰蓝绿 / 软素质 #9C8B70 驼),状态色(命中 #4F8063 苔绿 / 部分 #C0954E 赭黄 / 缺口 #B6634A 陶土红);历史简历分数三档、求职日历 ＋面试/＋AI测评 按钮与标签、面试提醒紧急色条同步降饱和。均为 `page.tsx` 内 `DOMAIN_STYLE`/`STATUS_STYLE`/分数 cfg/`HomeCalendar` 的硬编码色。字体未动(用户认可)。**待办**:其他内页(jd-analysis/practice/tracker/profile)卡内若仍有亮色可同法再扫。
- **换色卡:自然系墨绿/薄荷/米杏(试色)**:按用户参考色卡重写 `globals.css` 的 `:root` tokens——`--primary` 靛蓝→**深墨绿 #2E5B54**、新增 `--hero #234B47`(Hero 大卡)/`--accent #E7DBC4`(米杏强调)/`--accent-dk`、`--bg`→极浅暖薄荷 #F4F7EE、`--surface2`→浅薄荷 #E9EFDD、`--border`→薄荷灰绿、文字三档→墨绿系。首页工作台 Hero 卡 `#3a3a5c`→`var(--hero)` 深墨绿、CTA 改米杏底+墨绿字;`layout.tsx` 主区 bg `#FAF8F4`→`var(--bg)`;`Sidebar.tsx` 的 indigo(头像/选中/角色链接/移动端)→ `var(--primary)`。**故意保留语义色**:能力胶囊 5 个领域色、命中/部分/缺口红黄绿。**待办**:① 领域色(方向仍 indigo)调成更搭墨绿的一组;② 扫残留硬编码 indigo(日历＋面试按钮、jd-analysis/practice 等内页局部)。

### 2026-06-29
- **补能力胶囊两处漏洞(前端接线)**:① 右列「所需能力」此前永远空——`resume/page.tsx` 的 `analyzeJD`(解读 JD)成功后顺带后台调 `api.ai.tagMatch`,把 `{jd_tags,my_tags}` 写入 `localStorage.jobpilot_last_tagmatch`,首页右列即出数据(失败静默、不阻塞 JD 解读)。② 胶囊点击跳转此前不定位——`profile/page.tsx` 读 `?focus=<type>-<id>`(internship/project),数据加载后切到对应 tab、滚动到该素材卡并高亮 3 秒(卡片加 `id` 锚点 + 主色 ring);effect 依赖 `[internships,projects]` 以等数据就绪。

### 2026-06-27
- **求职日历:默认展开当天 + 固定高度,底部与能力胶囊对齐**:`HomeCalendar` 的「点某天看明细/加面试·AI测评」面板改为**默认展开当天**(`sel` 初始为今天,不再需要先点);面板固定高度(150px,事件多了内部滚动,**不随标签数量撑高卡片**);当前 150px 面板高度让日历卡底部与能力胶囊卡底部基本齐平。仅改 `HomeCalendar`,中栏布局保持原样。
- **能力胶囊**每列「3 个以上即折叠」(`view all`,LIMIT=3)。（注:此前一版曾把历史简历移出中栏 + 拉伸能力胶囊来对齐,已按要求回退,仅靠日历自身高度对齐。）
- **受控标签词表(唯一真源)**:新增 `backend/core/tags.py`,落地 36 个产品经理受控标签,五域强制分离(direction 方向 / method 方法 / domain 行业 / tooling 工具 / soft 软素质),每个 `{id,label,domain,aliases}`。设计要点(防漂移):① 拆开易混对(增长产品 vs 增长方法、企业服务 vs B端产品、数据产品 vs 数据分析);② 别名收口(`normalize()` 把别名/大小写/空格差异折叠为标准 id);③ 软素质默认不打、克制;④ 受控生长(无法归类入 `uncatalogued` 候选区,不自动扩表)。匹配权重:方向/方法 ×1.0 → 行业 ×0.6 → 工具 ×0.3 → 软素质 ×0.2。提供 `build_tag_catalog_block()`(注入 LLM prompt 的固定清单+映射指令)、`all_tags_public()`。
- **标签匹配端点**:`backend/api/ai.py` 新增 ① `GET /api/v1/ai/tags`(返回词表供前端展示/分组,前端不自维护副本);② `POST /api/v1/ai/tag-match`(照搬 jd-profile 模式)——读素材库(实习/项目/技能),一次 LLM 调用同时抽「JD 需求标签(带 核心/重要/加分)」+「我的标签(每个关联支撑素材 id、标强/弱)」,后端做标签收口、素材 id 校验、命中状态(命中/部分/缺口)与加权匹配分;③ `GET /api/v1/ai/my-tags`(不依赖 JD,仅按素材库聚合「我的能力标签」+ 支撑素材 id,供首页左列)。真实实测:my-tags 21 个标签全部正确关联素材;tag-match 优先级/命中合理、精准识别缺口(JD 要 AIGC 而素材无→缺口)、别名全干净映射、匹配分 90。
- **首页「能力胶囊」(原「快速使用」改名)**:参考课程列表卡片风格(每标签**独占一行**:实色圆角图标方块[首字]+ 标题/副标题 + 右侧药丸,**不再是挤一起的小胶囊**),左右两列——左「个人能力」(`my-tags`,图标按领域实色:方向 indigo/方法 emerald/行业 amber/工具 sky/软素质 gray,副标题=领域+经历数,右药丸「查看经历」,点击跳对应素材;localStorage 缓存避免每次调 LLM,带刷新)、右「所需能力」(最近一次 JD 分析的需求标签,图标/药丸按命中状态着色:命中绿/部分琥珀/缺口红并排最前,副标题=优先级+领域,点击跳支撑素材)。各列超 5 个折叠为 `view all`。右列空态引导去工作台分析 JD。`lib/api.ts` 加 `MyTag/JdTag/TagMatchResult` 类型与 `api.ai.myTags/tagMatch`。**注:① 右列数据需简历工作台跑 tag-match 后写入 `localStorage.jobpilot_last_tagmatch`(待接线);② 胶囊现跳 `/profile?focus=<type>-<id>`,profile 页定位/高亮素材待实现。**
- **废弃**:此前的「快速使用真实案例三步截图」方案(用户反馈截图密集不好看)已撤,连同 `tools/capture_demo.py`、`frontend/public/demo/*` 删除(`resume/page.tsx` 的 `data-shot` 锚点保留,无害可复用)。
- **运维**:发现线上后端进程是无 `--reload` 启动的(改代码不热加载);因数据库已上云(Supabase),重启无本地数据丢失风险,已重启。注:Windows 下 `--reload` 的 WatchFiles 偶发卡死(检测到改动但新 worker 不启动),改 backend 代码后宜手动重启确认路由生效。
- **统一标题系统**:各模块标题移到卡片外上方、统一深色加粗、简历工作台最大(`text-xl`)其余小一档(`text-base`):简历工作台 / 快速使用 / 历史简历版本 / 求职日历 / 求职路径。卡内只放内容(工作台卡内为大字介绍+CTA)。引入卡通字体「站酷快乐体」(`ZCOOL_KuaiLe`,next/font)+ `.font-cartoon` class 已全部就位;但环境无法下载 Google Fonts 字体文件,**卡通字体暂未生效(显示 fallback),待放本地字体文件后启用**。
- **历史简历卡调整**:卡片变窄(`w-40`)、改单行横向滚动(`flex overflow-x-auto`,不换行、不限数量、多了滚轮横滑)、删掉卡片底部与版本名重复的公司行。
- **修复 hydration 警告**:`useProfile` 初始改用默认值、挂载后再读 localStorage,消除 SSR/CSR 首屏不一致(dev 的「1 Issue」消失)。
- **首页三栏等高**:右栏改 `flex flex-col`、求职路径卡 `lg:flex-1` 撑满,使右栏底部与中栏齐平,视觉对齐。
- **简历分数卡片改版**:历史简历卡片改为「上部分档图画区 + 下部进度条」。分数按 0-60 / 60-80 / 80+ 三档,每档不同图(暂用 emoji 占位 🌱/⭐/🏆,未评分 📄,**待用户替换为图片**);分数以进度条 + 数字展示,颜色按档(红/琥珀/绿)。
- **首页三栏布局**:首页改为真正的左中右三栏——左边栏宽度不变;中栏主内容(工作台 banner / 新手清单 / 历史简历)压缩变窄;右栏「日历系统」(月历 + 求职路径)贯穿整个右侧。`flex flex-col lg:flex-row` 响应式(宽屏横排、窄屏竖排),仍在 `max-w-6xl` 容器内(与其他页边距一致)。
- **首页日历**:右栏求职路径下方加精简月历(参考 Elearn dashboard)。点日期可记「面试」「AI测评」标签(复用 `calendar` 后端 / `custom_calendar_events`,type 用面试/AI测评);有事件的日期数字加粗主色+底部圆点标记,今天主色高亮。新增 `HomeCalendar` 组件(`page.tsx`,复用 `buildGrid`)。
- **页面边距统一**:所有内容页(首页/刷题/日历/档案/JD分析/功能导览)左右边距统一为 `max-w-6xl mx-auto px-4`,与投递看板、简历工作台看齐;设置页(窄表单)保持原样。
- **工作台卡调整**:参考 Elearn dashboard,把工作台 banner 从亮靛蓝大卡改为深紫(`#3a3a5c`)适中卡(高度约减半、标题缩到 `text-lg`、小 CTA),更克制不刺眼;参考图的珊瑚橙/柔紫主色待色卡定后再全站统一。
- **顶部布局升级**:问候语「Hi，未来的产品经理」从首页移到侧边栏顶部(头像+名字+目标角色,可点进档案),侧栏底部不再重复用户信息;首页简历工作台改为主色靛蓝渐变的醒目大卡(白字大标题 + 白底 CTA + 文档图标装饰),其余板块上移。
- **首页布局重构(参考 dashboard 布局)**:① 侧边栏从 hover 展开改为**常驻展开**(图标+文字,`Sidebar.tsx` 固定 `w-52`、`layout.tsx` 主区 `ml-52`);② 首页改为顶部投递入口 + 下方两栏:左=历史简历版本(空时虚线图框占位、不留白),右=「求职路径」统计(简历改写/累计投递/待面试/Offer);容器放宽到 `max-w-5xl`。仅改 `Sidebar.tsx`/`layout.tsx`/`page.tsx`。
- **首页顺序微调**:简历工作台置顶(精简掉卡片内"最近版本"展示与底部"总投递/面试中/已刷题/Offer"统计条,避免与下方历史简历区、求职路径重复);新手清单移到工作台下方。
- **新手引导**:首页加「三步开始」新手清单(简历→投递→刷题,对应三大核心功能),完成状态用真实数据自动判定、可点击直达、全完成自动隐藏。解决新用户"进来不知道干什么"。这是产品进步路线**第一阶·地基**(冷启动引导)的第一步。仅改 `frontend/app/page.tsx`。
- **产品路线共识**:丰富度问题的本质不是功能少,而是新用户缺"越用越深的路径 + 回来的理由"。三阶路线:① 地基(新手冷启动引导)→ ② 留存(功能闭环 + 进度可视化,可启用遗留的漏斗/求职猫组件)→ ③ 深度(按习惯推荐/更强AI)。不跳级。

### 2026-06-26
- **真题深挖(第七批)**:WebFetch 抓取具体面经帖受网络策略限制(csdn/cnblogs/woshipm 均无法验证),改从搜索摘要提取字节/腾讯特色真题 6 道(竞品功能分析、常用 App 分析、化繁为简表达、AIGC 创业方向、主流大模型对比、群面推进),题库 116→122。脚本 `tools/seed_questions_7.py`。
- **真题搜罗(第六批)**:WebSearch 真实面经(运营/大厂/AI 方向),补 10 道高频真题(用户运营理解、社群情景题、腾讯运营手段题、网易蔬菜配送 case、三种运营区别、为何做产品、字节 CTR 辛普森题、大模型选型、Prompt 工程、AI 产品流程),题库 106→116。脚本 `tools/seed_questions_6.py`。
- **题库分类合并**:21 个细分类合并为 6 大类(产品 / AI产品 / 数据与增长 / 运营 / 行为面试 / 案例分析),解决分类过碎、小分类只有 1-2 题的问题(数据库 UPDATE category,可逆)。
- **真题补充**:对照真实大厂面经,补 7 道高频但此前遗漏的题(需求来源、与设计/开发冲突、PM工作职责、"优化某产品"开放题、0到1设计、AI PM vs 传统PM、个人优势),题库 99→106。脚本 `tools/seed_questions_5.py`。
- **题库质量**:体检 99 题结构健康(无空字段 / 答案过短 / 完全重复);校准 4 道行为套路题难度 中等→简单(简单题 8→12,梯度更合理)。结论:结构完整性已达标,进一步提质宜靠真实大厂真题或上线后用户刷题数据迭代,而非闭门重写。
- **题库**:第三、四批继续扩充共 37 题(新题型:产品设计/估算/案例分析/压力反问;各方向加深),云端题库 62→99。脚本 `tools/seed_questions_3.py`、`seed_questions_4.py`。题库 4 个批次脚本均按题干去重、可重复运行,加题改 `QUESTIONS` 列表再跑即可。
- **题库**:第二批扩充 22 题(产品各方向加深 B/C/增长/数据/AI/商业化/策略 + 运营加深 用户/内容/活动/私域 + 新增行为面试),云端题库 40→62。脚本 `tools/seed_questions_2.py`。
- **文档**:新增 `架构说明.md`(产品经理友好版),用餐厅比喻分 4 层讲清架构与数据库存储设计(Level 1 全局 / 2 表与关联 / 3 字段与JSON / 4 运行机制与防丢)。后端逻辑部分待补。
- **补迁(修事故)**:云迁移当时只迁了题库,遗漏了本地的**用户真实数据**(简历版本、素材库 实习3/项目4/技能8、投递1),导致前端"简历信息失踪"。数据未丢、仍在本地 SQLite,已用 `tools/migrate_local_to_cloud.py` 补迁到云端(按关键字段去重、保留 application 关联),全部恢复。**教训:迁移必须覆盖所有表或迁后逐表核对,不能只迁一部分。**

### 2026-06-25
- **题库**:补充 17 道完整题目(运营全套:用户/活动/内容/数据/增长运营;产品加深:商业化/AI/策略/需求优先级/竞品),云端题库 23→40。新增可复用入库脚本 `tools/seed_questions.py`(改 QUESTIONS 再跑即可、按题干去重)。加索引(`interview_questions.category`、`question_practice` 的 `question_id`/`practiced_at`、各表 `application_id`、`applications.status`),并持久化进 `init_db` 的 `_create_indexes()`。
- **计划**:「按用户习惯推送题目」依赖丰富题库 + 刷题行为数据(`question_practice` 已记录对错/用时/时间),待数据积累后按"错题重练/薄弱分类多推/未练过优先"实现。
- **云迁移**:数据库迁到 Supabase 云端 Postgres(17)。① `.env` 加 `DATABASE_URL`,`core/config.py` 增 `database_url` 字段、`database.py` 改从 settings 读取(原先只读系统环境变量,读不到 .env);② 修复 SQLite→Postgres 兼容 bug:`_pg_row_to_dict` 改返回支持位置索引的 `_Row`(原先 `fetchone()[0]` 在 Postgres 报 `KeyError: 0`);③ 题库 23 题迁入云端,读写验证通过;④ 删除两个 jobpilot-v2 旧副本的 `.db`(已备份到 `backend/data/backups/`),v4 本地 `.db` 保留兜底;⑤ 全接口复验时修复 `practice/stats` 用了 SQLite 专有的 `datetime('now','-7 days')`(Postgres 无此函数)——改为在 Python 算好时间区间当参数传,跨库通用。复验 11 个 GET 接口全部 200。
- **数据安全**:本地 SQLite 上保险(`backend/core/database.py`)。① `get_db` 弃用 WAL、改 rollback journal(`TRUNCATE`)+ `synchronous=FULL`,提交即落盘主库,进程被强杀也不丢已提交数据;② `init_db` 启动时用 SQLite backup API 自动快照到 `backend/data/backups/`(保留最近 15 份)。`.gitignore` 已忽略 backups。
- **优化**:首页极简克制改造(已确认保留,达到初步预想)。统一圆角为 `rounded-xl`、评分徽章去彩色块只留色字、去掉卡片内多余边框(框中框)。方向为 Linear/Vercel 那类极简克制专业风。
- **计划**:出统一设计色卡。现状 `frontend/app/globals.css` 已有中性 tokens(`--primary #6366F1` 靛蓝、`--bg/surface/surface2/border`、文字三档 `--text-main/sub/muted`),并保留旧橙色别名 `--primary-old #C17A3B`。色卡待补:主色深浅档、语义色(success/warning/danger)入 token、清理 `--primary-old` 遗留、散落文字色收敛到三档、按钮样式规范 2-3 种。

### 2026-06-24
- **新增**:UI 截图工具 `tools/screenshot.py`(Playwright)。Claude 可自行截图查看页面渲染效果(支持指定 url / 视口 / 全页 / `--ls=` 预设 localStorage 跳过弹窗),用于 UI 迭代自查,无需每次让用户截图。
- **记录**:首页遗留组件(漏斗 / 日历 / 求职猫)有意保留、暂不启用的决策,详见上方「遗留组件」小节。
- **新增**:JD → 素材库经历智能匹配推荐。粘贴 JD 后在工作台 Step2 点「🎯 推荐匹配经历」,AI 对照素材库(实习/项目)按匹配度排序并给理由,每条可「＋ 加入简历」追加到简历框。后端新增 `POST /api/v1/ai/match-materials`(`backend/api/ai.py`,照搬 jd-profile 模式,只返回 id+match+reason 并校验 id);前端 `frontend/lib/api.ts` 加 `api.ai.matchMaterials`;`frontend/app/resume/page.tsx` 加推荐区 UI,并把单条经历→文本抽成 `internToText`/`projectToText` 供导入与推荐共用。素材库为空时显示去 Profile 的引导。
- **备注**:为验证功能,在本地库 `profile_internship`/`profile_project` 插了 3 条测试经历(字节B端实习、C端运营实习、校园二手平台项目),可在 Profile 页删除或替换为真实经历。
- **优化**:首页排版收敛。原先用了 10 种字号(含 8/9/10/11px 任意小号)+ 3 种字重,层级混乱。统一为 4 档字号(`text-xl` 大标题 / `text-base` 卡片标题·数字 / `text-sm` 正文 / `text-xs` 辅助标签)+ 单一强调字重 `font-semibold`(正文用默认)。仅改 `frontend/app/page.tsx`。规则:`[8/9/10/11px]`→`xs`、`lg`→`base`、`2xl`→`xl`、`bold/medium`→`semibold`。

### 2026-06-23
- **新增**:简历「历史版本一键还原」。`resume_versions` 表新增 `snapshot_json` 字段,保存版本时一并存储完整改写结果 + JD + 面试官评分快照;首页与工作台点击历史版本可 1:1 还原当时的对比界面,旧版本(无快照)降级为只读正文。涉及 `backend/core/database.py`、`backend/api/resume.py`、`frontend/lib/api.ts`、`frontend/app/resume/page.tsx`、`frontend/app/page.tsx`。
- **修复**:前端 API 代理缺失。新增 catch-all 代理 `frontend/app/api/[...path]/route.ts`,将 `/api/*` 转发到后端(此前除文件上传外所有接口返回 404)。
- **修复**:`frontend/.env.local` 的 `NEXT_PUBLIC_API_URL` 端口写错,8001 → 8000。
- **事故**:本地 SQLite 数据丢失(投递记录 / 档案 / 旧简历版本)。原因为后端进程被强制结束,WAL 写缓存未落盘。题库 23 题已从 v2 旧副本恢复导入,其余数据需重新录入。
- **进行中**:数据库迁移到云端 PostgreSQL;迁移验证通过后删除本地多余 `.db` 文件。
