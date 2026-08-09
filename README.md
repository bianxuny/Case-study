# Jiayi's Case Study

个人作品集网站，展示医疗 MVP、工业 B 端与实验室自动化等设计实践。整站通过 **Vibe Coding**（Cursor + AI 辅助）迭代完成——从布局、交互到内容结构，边做边改、快速验证。

视觉与信息架构参考 [IBM Carbon Design System](https://carbondesignsystem.com/) 与 IBM 硬件产品页的组织方式：左侧导航、Leadspace 首屏、统计栏、分区卡片与详情侧栏。

## 技术栈

- 纯静态站点：HTML / CSS / JavaScript（ES Modules）
- 无构建步骤，内容驱动自 `data/portfolio.json`
- 字体：IBM Plex Sans / Mono
- 图标：`@carbon/icons`（按需引用）

## 主要功能

| 模块 | 说明 |
|------|------|
| Hero 轮播 | 图片 / 视频混播，自动轮播，原比例展示 |
| 侧边导航 | Overview · Experience（时间轴）· About |
| 作品分区 | 医疗 / 工业 / Demo，卡片列表 + 悬停预览 |
| 详情面板 | 点击卡片，右侧展开完整描述、亮点与图集 |
| 经历时间轴 | 工作泳道，年份压缩与里程碑标记 |
| 中英切换 | `meta`、分区、卡片文案均支持 `zh` / `en` |

## 项目结构

```
Jiayi Portfolio/
├── index.html                 # 页面骨架
├── data/
│   └── portfolio.json         # 全站内容（meta、轮播、时间轴、作品、关于）
├── css/
│   ├── variables.css          # 设计 token
│   ├── carbon-type.css        # Carbon 字体层级
│   ├── layout.css             # 页面布局、网格、首屏
│   ├── hero-carousel.css      # 轮播
│   ├── page-navigation.css    # 侧边导航
│   ├── timeline.css           # 经历时间轴
│   ├── components.css         # 卡片、统计、详情面板
│   ├── card-preview.css       # 卡片悬停预览
│   └── sidebar-about.css      # 关于侧栏
├── js/
│   ├── main.js                # 入口：加载数据、渲染各模块
│   ├── i18n.js                # 中英切换
│   ├── hero-carousel.js       # 轮播逻辑
│   ├── masonry.js             # 作品卡片
│   ├── timeline.js            # 时间轴
│   ├── page-navigation.js     # 导航
│   ├── sidebar-about.js       # 关于
│   ├── card-preview.js        # 悬停预览
│   └── stats-cat.js           # 统计栏动效
└── assets/
    ├── images/
    ├── videos/
    └── gifs/
```

## 关于 Vibe Coding

这个站点本身就是一次 **Demo → 交付** 的实践：用 Cursor 快速搭原型、调布局、改文案，把想法直接落成可浏览、可迭代的页面。内容（案例描述、亮点、图片）与结构（JSON 数据层）分离，边验证边沉淀，持续迭代。

---

**Jiayi Qian** · Product Designer · Rapid Prototyper
