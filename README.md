# World Cup Matchday Notifier

一个纯前端世界杯比赛日通知页。页面每天获取 FIFA World Cup 赛程，按所选时区筛选当天比赛，并生成可以复制或通过浏览器通知发送的中文提醒消息。

本项目根据 `AI-Native Engineering Challenge.md` 创建。原挑战建议制作小游戏；本仓库选择了一个更贴近日常使用场景的小工具，并保留完整的规格、架构、测试与复盘文档。

## Features

- 每次打开页面都会获取当天世界杯赛程。
- 支持日期和时区选择，默认使用中国时间。
- 生成一条可直接发送的通知文案。
- 展示开球时间、分组、场地、转播信息和队徽。
- 支持复制通知文案和浏览器桌面通知。
- ESPN API 不可用时使用内置回退赛程，避免页面空白。
- 自动寻找下一个比赛日，并用本地预测模型给出胜平负倾向和比分预测。

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

发布成功后，页面地址通常会类似：

```text
https://sandy-wu-news-notification.pages.git.ringcentral.com
```

实际 URL 以 GitLab 项目 `Deploy > Pages` 页面显示为准。

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

测试覆盖日期换算、ESPN 数据标准化、按时区筛选和通知文案生成。
同时覆盖下一个比赛日查找和预测模型输出。

## Data Source

实时数据来自 ESPN public scoreboard API：

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
```

页面会请求目标日期前后各一天的数据，再用浏览器端时区过滤目标自然日，避免跨时区开球导致比赛漏掉。

## Prediction Model

预测模型是本地 `Elo-Poisson v2` 模型，不调用付费或博彩服务。它结合球队基础 rating、近期状态、赛会主办国场地修正和 Poisson 比分分布，输出胜平负概率、预期进球、比分置信度和预测比分。

这个模型没有做历史回测，也不会读取伤病、首发、赔率或实时 FIFA/Elo 排名，所以结果只适合作为赛前参考。
