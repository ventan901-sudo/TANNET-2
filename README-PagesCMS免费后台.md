# TANNETVISION 免费后台版

这套网站已经从 `data.js` 改为 JSON 数据文件，并加入 Pages CMS 配置 `.pages.yml`。
以后你不需要手改代码，可以在 Pages CMS 的表单界面中维护内容。

## 一、第一次上线只做一次

### 1. 建 GitHub 仓库
1. 注册 / 登录 GitHub。
2. 新建一个仓库，例如 `tannetvision`。
3. 把这个压缩包解压后的 **全部文件** 上传到仓库根目录。
4. 注意 `.pages.yml` 是隐藏文件，也必须一起上传。

### 2. 连接 Pages CMS（免费后台）
1. 打开 `https://app.pagescms.org/`。
2. 使用 GitHub 登录。
3. 按提示安装 Pages CMS GitHub App，只授权你的 TANNETVISION 仓库即可。
4. 打开该仓库。
5. 因为仓库根目录已经有 `.pages.yml`，后台会直接出现：
   - 网站设置
   - 项目管理
   - 经历管理
   - 素材管理 → 视频 / 照片 / LUT
   - 联系方式

### 3. 用 Cloudflare Pages 免费上线
1. 登录 Cloudflare。
2. Workers & Pages → Create application → Pages。
3. Import an existing Git repository。
4. 选择你的 GitHub 仓库。
5. Production branch：`main`。
6. 这是纯静态网站，不需要框架。Build command 可以使用 `exit 0`。
7. Build output directory 填网站文件所在目录；如果仓库根目录就是本网站，请按 Cloudflare 页面提示选择根目录作为输出目录。
8. 部署后会得到一个免费的 `*.pages.dev` 地址。

## 二、以后如何新增内容

以后不要改 `js/app.js`，也不用手改 JSON。

### 新增项目
Pages CMS → 项目管理 → 添加一项：
- 项目 ID：例如 `my-film-2026`
- 中文/英文项目名
- 年份、类型、职责
- 上传封面
- 完整视频链接：可以填 YouTube / Bilibili / MP4 地址
- 首页推荐：打开后会自动进入首页精选
- 排序：数字越小越靠前

### 新增视频素材
Pages CMS → 素材管理 → 视频素材 → 添加一项。
视频建议放 YouTube / Bilibili 等免费平台，后台只填视频链接；封面可以直接上传。

### 新增照片
Pages CMS → 素材管理 → 照片素材 → 添加一项，并上传图片。

### 新增 LUT
Pages CMS → 素材管理 → LUT 素材 → 添加一项：
- Before / After 图片
- `.cube` 或 `.zip` 文件
- 标题、信息、标签

## 三、重要说明

- Pages CMS 是编辑层，内容保存回 GitHub，不需要数据库。
- 本方案适合项目资料、图片、LUT、小文件。
- 不建议把 4K 视频原文件直接上传 GitHub；作品视频优先使用 YouTube/Bilibili 链接。
- `/admin/` 是你网站里的后台入口提示页，真正编辑界面在 Pages CMS 托管后台。
- 修改并保存后，Pages CMS 会写回 GitHub；如果 Cloudflare Pages 已连接 GitHub，会自动部署最新内容。

## 四、数据文件说明（一般不用手动改）

- `data/site.json`：网站名称、标语、首页背景
- `data/projects.json`：项目
- `data/experiences.json`：经历
- `data/videos.json`：视频素材
- `data/photos.json`：照片素材
- `data/luts.json`：LUT
- `data/contact.json`：联系方式

## 五、本地预览

因为浏览器安全限制，直接双击 `index.html` 可能无法读取 JSON 数据。
最简单的办法是：
- 上传 GitHub + Cloudflare Pages 后直接看在线网站；或
- 使用 VS Code 的 Live Server 扩展进行本地预览。
