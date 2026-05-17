# 销售能力测评系统

这是一个可部署到 GitHub Pages 的纯前端静态测评系统，使用 Vite + React + TypeScript + Tailwind CSS。系统不使用后端、不使用数据库、不调用 AI API，所有考试进度和结果都保存在浏览器 localStorage。

## 功能

- 员工输入姓名和部门后开始考试
- 60 分钟倒计时，自动保存，时间到自动提交
- 19 题销售能力综合笔试 V3版，总分 100 分
- 自动计算总分、等级、模块得分、能力维度得分
- 开放题根据关键词半自动评分，并标记需要人工复核
- 结果页支持导出 JSON、Markdown、HTML
- 员工提交后自动保存到 Supabase 云端数据库
- 员工开始前可以选择不同考试题
- 管理端支持上传新的考试题 JSON
- 管理端登录后自动读取全部云端提交结果
- 管理端支持按单次考试统计，也支持全部考试总体统计
- 管理端仍支持导入多个员工 JSON，统计成绩列表、能力维度均分、等级分布、最弱能力维度
- 管理端支持导出 CSV
- 使用 hash 路由，兼容 GitHub Pages

## 本地运行

先确认电脑已安装 Node.js。建议使用 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

命令运行后，浏览器打开终端里显示的本地地址，一般是：

```text
http://localhost:5173
```

## 打包检查

```bash
npm run build
```

成功后会生成 `dist` 文件夹。

## 页面入口

- 员工入口：`#/`
- 考试页：`#/exam`
- 结果页：`#/result`
- 管理端：`#/admin`

## 新手 GitHub 发布步骤

当前文件夹如果还不是 Git 仓库，按下面步骤来。

### 1. 初始化本地 Git 仓库

在项目文件夹里打开终端，执行：

```bash
git init
git add .
git commit -m "Create sales assessment system"
git branch -M main
```

### 2. 在 GitHub 创建空仓库

1. 打开 GitHub。
2. 点击右上角 `+`。
3. 选择 `New repository`。
4. 输入仓库名，例如 `sales-assessment-system`。
5. 不要勾选 README、.gitignore、license。
6. 点击 `Create repository`。

### 3. 把本地项目推到 GitHub

GitHub 创建仓库后会显示一段命令。找到类似下面这两行，把其中的地址换成你自己的仓库地址：

```bash
git remote add origin https://github.com/你的用户名/sales-assessment-system.git
git push -u origin main
```

### 4. 打开 GitHub Pages

1. 进入 GitHub 仓库页面。
2. 点击 `Settings`。
3. 左侧点击 `Pages`。
4. 在 `Build and deployment` 里，`Source` 选择 `GitHub Actions`。
5. 回到仓库上方 `Actions` 标签页，等待 `Deploy to GitHub Pages` 运行成功。
6. 成功后，Pages 页面会显示可访问的网址。

以后每次你修改代码，只需要：

```bash
git add .
git commit -m "Update assessment system"
git push
```

GitHub 会自动重新部署。

## 员工使用流程

1. 打开网站。
2. 填写姓名和部门。
3. 点击开始考试。
4. 完成答题并提交。
5. 在结果页下载 JSON、Markdown 或 HTML。
6. 把 JSON 文件发给管理者用于汇总。

## 管理者使用流程

1. 打开 `#/admin`。
2. 使用 Supabase Authentication 中创建的管理员邮箱和密码登录。
3. 登录成功后，系统会自动读取所有员工云端提交结果。
4. 如需增加新考试题，点击下载试卷模板，按模板修改后上传 JSON。
5. 在统计范围中选择“全部考试总体统计”或某一套具体考试。
6. 查看成绩列表、等级分布、能力维度统计、各考试总体统计和最弱能力维度。
7. 点击导出 Excel CSV 保存当前统计范围的汇总表。

## Supabase 多试卷表

如果要使用“上传考试题”和“员工选择考试题”，需要在 Supabase 的 SQL Editor 里运行 `supabase-exam-sets.sql` 中的 SQL。

运行方式：

1. 打开 Supabase 项目。
2. 左侧点 `SQL Editor`。
3. 点 `New query`。
4. 复制 `supabase-exam-sets.sql` 的全部内容。
5. 点 `Run`。

注意：这段 SQL 依赖之前已经创建好的 `public.is_admin()` 函数和 `admin_users` 表。

## 评分规则

- 第一部分路径题共 10 题，每题 3 分：路径正确 2 分，理由关键词命中 1 分。
- 开放题根据每题 `scoringPoints` 的关键词半自动评分。
- 开放题都会标记 `needsManualReview=true`，便于管理者复核。
- 等级规则：
  - 90-100：A
  - 80-89：B+
  - 70-79：B
  - 60-69：C
  - 60 以下：D

## 数据安全说明

- 前端只包含 Supabase Publishable key，不包含 Secret key 或 service_role key。
- 员工提交结果会写入 Supabase `assessment_results` 表。
- 管理端读取云端结果需要 Supabase 登录，并依赖 Row Level Security 限制读取权限。
- 员工本地浏览器仍会保存最近一次结果，方便导出 JSON、Markdown、HTML。
