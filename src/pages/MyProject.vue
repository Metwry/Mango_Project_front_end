<script setup>
const projectIntro =
  "面向个人资产管理，基于前后端分离架构实现的智能财务管理系统，覆盖账户管理、投资数据跟踪、智能助手等核心功能"

const sections = [
  {
    id: "project-showcase",
    label: "项目展示",
    items: [
      {
        title: "账户数据面板",
        description:
          "集中展示账户结构、资产变化与资金流动情况，让账户全景信息在同一块面板中清晰呈现。",
        image: "/pic/1-页面功能展示-账户数据面板.png",
        alt: "账户数据面板",
        tone: "lavender",
      },
      {
        title: "市场行情监控",
        description:
          "对 A 股、美股、外汇和加密货币等多市场标的进行统一监控，适合跨市场配置下的连续观察与筛选。",
        image: "/pic/2-页面功能展示-市场行情监控.png",
        alt: "市场行情监控",
        tone: "sky",
      },
      {
        title: "投资仓位展示",
        description:
          "聚焦投资持仓的收益变化、成本表现与仓位波动，帮助用户快速理解当前投资组合状态与阶段性表现。",
        image: "/pic/3-页面功能展示-投资仓位展示.png",
        alt: "投资仓位展示",
        tone: "peach",
      },
    ],
  },
  {
    id: "ai-showcase",
    label: "AI功能展示",
    items: [
      {
        title: "新闻概要总结(RAG)",
        description:
          "用更短路径给出市场新闻的核心结论与概览，适合作为智能助手入口中的快速阅读层。",
        image: "/pic/4-Ai功能-新闻概要总结.png",
        alt: "新闻概要总结",
        tone: "lavender",
      },
      {
        title: "新闻详细介绍(RAG)",
        description:
          "在简要摘要基础上进一步展开新闻背景、市场影响和重点事件细节，让用户能快速从摘要进入深度阅读。",
        image: "/pic/5-Ai功能-新闻详细介绍.png",
        alt: "新闻详细介绍",
        tone: "mint",
      },
      {
        title: "投资仓位分析",
        description:
          "通过 AI 对投资仓位进行总结与解释，帮助用户从数据层面快速理解持仓变化和投资状态。",
        image: "/pic/6-Ai功能-投资仓位分析.png",
        alt: "投资仓位分析",
        tone: "peach",
      },
      {
        title: "账户数据分析",
        description:
          "围绕账户总量、增长趋势和风险特征给出总结，方便用户更快理解资产结构变化与关键驱动项。",
        image: "/pic/7-Ai功能-账户数据分析.png",
        alt: "账户数据分析",
        tone: "mint",
      },
      {
        title: "交易智能体",
        description:
          "围绕交易执行流程设计的智能体分支，支持草稿加载、工具调用、预览、取消与提交等关键步骤，提升交易过程的可控性。",
        image: "/pic/8-Ai功能-交易智能体.png",
        alt: "交易智能体",
        tone: "sky",
      },
    ],
  },
  {
    id: "agent-architecture",
    label: "Agent架构",
    items: [
      {
        title: "整体 Agent 架构图",
        description:
          "系统会先准备会话上下文，再根据用户意图分发到通用问答、新闻分析和交易执行三个智能体，最后统一汇总结果。",
        image: "/pic/9-Ai架构图-agent架构图.png",
        alt: "整体 Agent 架构图",
        tone: "mint",
        compact: true,
      },
      {
        title: "交易 Agent 架构图",
        description:
          "交易 Agent 从草稿进入执行流程，在预览、取消和提交等分支之间进行控制，确保交易动作具备完整的确认链路。",
        image: "/pic/10-Ai架构图-交易agetn架构图.png",
        alt: "交易 Agent 架构图",
        tone: "sky",
        compact: true,
      },
    ],
  },
]
</script>

<template>
  <div class="project-page">
    <div class="project-page__glow project-page__glow--left"></div>
    <div class="project-page__glow project-page__glow--right"></div>

    <nav class="project-nav" aria-label="页面分区导航">
      <a href="#project-showcase">项目展示</a>
      <a href="#ai-showcase">AI功能展示</a>
      <a href="#agent-architecture">Agent架构</a>
    </nav>

    <header class="project-hero">
      <section class="hero-copy">
        <p class="hero-copy__eyebrow">MANGO FINANCE</p>
        <h1>芒果财务管理(Ai赋能)</h1>
        <p class="hero-copy__lead">{{ projectIntro }}</p>
        <p class="hero-copy__website">
          网站地址：
          <a href="https://mangofinance.cc" target="_blank" rel="noreferrer">mangofinance.cc</a>
        </p>
      </section>
    </header>

    <main class="project-content">
      <section v-for="section in sections" :id="section.id" :key="section.id" class="content-section">
        <div class="content-section__head">
          <h2>{{ section.label }}</h2>
        </div>

        <div class="showcase-list">
          <article v-for="item in section.items" :key="item.title" class="showcase-card"
            :class="`showcase-card--${item.tone}`">
            <div class="showcase-card__copy">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>

            <div class="showcase-card__media">
              <div class="showcase-card__image-shell" :class="{ 'showcase-card__image-shell--compact': item.compact }">
                <img :src="item.image" :alt="item.alt" loading="lazy" />
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.project-page {
  --text-strong: #0f665f;
  --text-body: #496f6b;
  --surface-strong: rgba(255, 251, 244, 0.9);
  --border: rgba(15, 102, 95, 0.12);
  --shadow: 0 30px 80px rgba(97, 92, 64, 0.12);
  --font-display: "Trebuchet MS", "Segoe UI", "PingFang SC", "Microsoft YaHei",
    sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: clip;
  overflow-y: visible;
  background:
    radial-gradient(circle at top left, rgba(241, 243, 173, 0.92), transparent 35%),
    radial-gradient(circle at top right, rgba(175, 230, 214, 0.82), transparent 34%),
    radial-gradient(circle at bottom center, rgba(255, 214, 196, 0.6), transparent 28%),
    linear-gradient(180deg, #f4f0dc 0%, #f5efe2 48%, #f3ece4 100%);
  color: var(--text-strong);
  scroll-behavior: smooth;
}

.project-page,
.project-page * {
  box-sizing: border-box;
}

.project-page__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(28px);
  opacity: 0.55;
  pointer-events: none;
}

.project-page__glow--left {
  top: 9rem;
  left: -4rem;
  width: 18rem;
  height: 18rem;
  background: rgba(255, 255, 255, 0.65);
}

.project-page__glow--right {
  right: -2rem;
  top: 18rem;
  width: 16rem;
  height: 16rem;
  background: rgba(182, 237, 226, 0.58);
}

.project-hero,
.project-content {
  position: relative;
  z-index: 1;
  width: min(1240px, calc(100% - 2rem));
  margin: 0 auto;
}

.project-hero {
  padding: 1.75rem 0 1.5rem;
}

.project-nav {
  position: sticky;
  top: 0.75rem;
  z-index: 60;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
  margin-left: auto;
  margin-right: auto;
  width: min(calc(100% - 2rem), 42rem);
  padding: 0.5rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 251, 244, 0.42);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 12px 30px rgba(73, 111, 107, 0.08);
}

.project-nav a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 8.5rem;
  padding: 0.9rem 1.35rem;
  border-radius: 999px;
  background: rgba(255, 251, 244, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.52);
  box-shadow: 0 16px 36px rgba(73, 111, 107, 0.08);
  color: rgba(73, 111, 107, 0.94);
  text-decoration: none;
  font: 700 1rem/1 var(--font-display);
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.project-nav a:hover {
  transform: translateY(-1px);
  background: rgba(255, 251, 244, 0.92);
  color: var(--text-strong);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 0 1rem;
}

.hero-copy__eyebrow {
  margin: 0 0 1rem;
  color: rgba(73, 111, 107, 0.88);
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font: 700 0.84rem/1.2 var(--font-display);
}

.hero-copy h1 {
  margin: 0;
  font: 800 clamp(3.2rem, 8vw, 6.6rem) / 1.02 var(--font-display);
  letter-spacing: -0.05em;
}

.hero-copy__lead {
  max-width: 72rem;
  margin: 1.5rem auto 0;
  color: var(--text-body);
  font: 500 clamp(1.05rem, 1.7vw, 1.3rem) / 1.8 var(--font-display);
}

.hero-copy__website {
  margin: 1rem 0 0;
  color: var(--text-body);
  font: 600 1rem/1.6 var(--font-display);
}

.hero-copy__website a {
  color: var(--text-strong);
  text-decoration: none;
  border-bottom: 2px solid rgba(15, 102, 95, 0.18);
}

.project-content {
  padding-bottom: 4rem;
}

.content-section {
  padding-top: 1.2rem;
}

.content-section+.content-section {
  margin-top: 1.8rem;
}

.content-section__head {
  margin-bottom: 1rem;
  text-align: center;
}

.content-section__head h2 {
  margin: 0;
  font: 800 clamp(2.1rem, 4vw, 3.25rem) / 1.04 var(--font-display);
  letter-spacing: -0.04em;
}

.showcase-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.6rem;
}

.showcase-card {
  display: grid;
  grid-template-rows: auto auto;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 2rem;
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  overflow: hidden;
}

.showcase-card--lavender {
  background:
    linear-gradient(180deg, rgba(219, 182, 242, 0.64), rgba(255, 251, 244, 0.93) 34%),
    var(--surface-strong);
}

.showcase-card--mint {
  background:
    linear-gradient(180deg, rgba(172, 229, 220, 0.62), rgba(255, 251, 244, 0.93) 34%),
    var(--surface-strong);
}

.showcase-card--peach {
  background:
    linear-gradient(180deg, rgba(245, 203, 177, 0.6), rgba(255, 251, 244, 0.93) 34%),
    var(--surface-strong);
}

.showcase-card--sky {
  background:
    linear-gradient(180deg, rgba(185, 220, 248, 0.62), rgba(255, 251, 244, 0.93) 34%),
    var(--surface-strong);
}

.showcase-card__copy {
  padding: 2rem 2rem 1.1rem;
  text-align: center;
}

.showcase-card__copy h3 {
  margin: 0;
  font: 800 clamp(2rem, 3.5vw, 3rem) / 1.04 var(--font-display);
  letter-spacing: -0.05em;
}

.showcase-card__copy p {
  margin: 1rem auto 0;
  max-width: 58rem;
  color: var(--text-body);
  font: 500 1rem/1.76 var(--font-display);
}

.showcase-card__media {
  padding: 0 1.25rem 1.25rem;
}

.showcase-card__image-shell {
  overflow: hidden;
  border-radius: 1.35rem;
  border: 1px solid rgba(15, 102, 95, 0.08);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 50px rgba(64, 70, 54, 0.14);
}

.showcase-card__image-shell--compact {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.showcase-card__image-shell img {
  display: block;
  width: 100%;
  height: auto;
}

.showcase-card__image-shell--compact img {
  width: auto;
  max-width: 100%;
  max-height: 34rem;
  object-fit: contain;
}

@media (max-width: 640px) {

  .project-hero,
  .project-content {
    width: min(100% - 1rem, 1240px);
  }

  .project-nav {
    top: 0.5rem;
    gap: 0.7rem;
    width: min(calc(100% - 1rem), 42rem);
    padding: 0 0.25rem;
  }

  .project-nav a {
    min-width: auto;
    padding: 0.82rem 1rem;
    font-size: 0.94rem;
  }

  .showcase-card {
    border-radius: 1.4rem;
  }

  .showcase-card__copy {
    padding: 1.15rem 1.15rem 0.9rem;
  }

  .showcase-card__media {
    padding: 0 1rem 1rem;
  }

  .showcase-card__image-shell {
    border-radius: 1rem;
  }
}

@media (prefers-reduced-motion: no-preference) {

  .showcase-card,
  .project-nav a {
    transition:
      transform 220ms ease,
      box-shadow 220ms ease;
  }

  .showcase-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 34px 82px rgba(64, 70, 54, 0.18);
  }
}
</style>
