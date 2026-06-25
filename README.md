# World Cup Forecast Board

一个纯前端世界杯赛前预测与比赛日通知页。页面每天获取 FIFA World Cup 赛程，按所选时区筛选比赛日，并用本地 Elo-Poisson 模型生成下个比赛日的胜平负概率和预测比分。

本项目根据 `AI-Native Engineering Challenge.md` 创建。原挑战建议制作小游戏；本仓库选择了一个更贴近日常使用场景的小工具，并保留完整的规格、架构、测试与复盘文档。

## Live Demo

Playable demo: https://natancy.github.io/football-news/

## Challenge Monitor Checklist

- Source code: `index.html`, `styles.css`, `src/*.js`.
- Required docs: `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `RETROSPECTIVE.md`.
- Hosted playable/demo link: https://natancy.github.io/football-news/
- Local run command: `npm run start`.
- Test command: `npm test`.

## Features

- 每次打开页面都会获取当天世界杯赛程。
- 支持日期和时区选择，默认使用中国时间。
- 预测区优先展示下个比赛日的胜平负概率、比分、预期进球和出线形势。
- 生成一条可直接发送的比赛日摘要通知文案。
- 赛程结果区保留开球时间、双方、比分/状态、小组和场地信息。
- 支持复制通知文案和浏览器桌面通知。
- ESPN API 不可用时使用内置回退赛程，避免页面空白。
- 自动寻找下一个比赛日，并结合小组积分形势给出胜平负倾向和比分预测。

## Setup

无需安装依赖。需要本机有 Python 3 和现代浏览器。

## Run

```bash
npm run start
```

然后打开：

```text
http://localhost:5173
```

也可以直接打开 `index.html`，但本地 HTTP 服务更接近真实部署环境。

## Deploy to GitLab Pages

仓库已包含 `.gitlab-ci.yml`。推送到 GitLab 默认分支后，pipeline 会：

1. 运行 `npm test`。
2. 将静态页面文件复制到 `public/`。
3. 通过 GitLab Pages 发布页面。

当前远程仓库为：

```text
https://git.ringcentral.com/rc-ai-learning/sandy-wu-news-notification.git
```

实际 URL 以 GitLab 项目 `Deploy > Pages` 页面显示为准。如果 GitLab Pages 开启了访问控制，自动 monitor 可能无法把它识别为公开 playable demo；README 顶部的 GitHub Pages 链接用于公开 demo 检查。

## Deploy to GitHub Pages

这个项目也可以直接用 GitHub Pages 的 branch source 发布：

1. 打开 GitHub 仓库 `Settings > Pages`。
2. `Source` 选择 `Deploy from a branch`。
3. `Branch` 选择 `main`，目录选择 `/root`。
4. 保存后等待 Pages build 完成。

发布地址通常是：

```text
https://natancy.github.io/football-news/
```

## Test

```bash
npm test
```

测试覆盖日期换算、ESPN 数据标准化、standings 标准化、按时区筛选和通知文案生成。
同时覆盖下一个比赛日查找、出线形势推导和预测模型输出。

## Data Source

实时数据来自 ESPN public scoreboard API：

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
```

页面会请求目标日期前后各一天的数据，再用浏览器端时区过滤目标自然日，避免跨时区开球导致比赛漏掉。

小组积分和出线形势来自 ESPN public standings API：

```text
https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026
```

## Prediction Model

预测模型是本地 `Elo-Poisson v2.1` 模型，不调用付费或博彩服务。它结合球队基础 rating、近期状态、小组积分/出线形势、赛会主办国场地修正和 Poisson 比分分布，输出胜平负概率、预期进球、比分置信度和预测比分。

这个模型没有做历史回测，也不会读取伤病、首发、赔率或实时 FIFA/Elo 排名。小组形势来自 ESPN 当前积分榜；如果接口不可用，页面会从球队 record 做保守推导。结果只适合作为赛前参考。
