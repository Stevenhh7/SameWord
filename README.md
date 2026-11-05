# 同词相遇

原生 HTML、CSS、JavaScript 前端和 Python 实时后端实现的多人联想小游戏。

## 启动

需要 Python 3.10 或更高版本。

```powershell
python -m pip install -r requirements.txt
python server.py
```

浏览器打开 <http://127.0.0.1:8000>。多个浏览器标签或不同设备可以通过六位房间号加入同一房间。本机以外的设备需要将服务启动为 `python server.py --host 0.0.0.0`，然后访问运行电脑的局域网 IP 和 8000 端口。也可以用 `--port` 修改端口。

## 玩法

- **同词联想**：2–4 人各自输入词语，提交后锁定。全员提交或计时结束时揭晓。如果词不相同，房主进入下一轮；所有人想到同一个词即通关。之前轮次出现过的词不能重复提交。
- **默契问答**：从生活、想象、性格或全部分类中选择 5、10、15 题。每题三个选项，揭晓后进入下一题。结束时按每题所有玩家两两选择相同的比例计算同步率。
- 房间支持 30 秒、60 秒或 5–300 秒自定义计时。答案在揭晓前只对本人可见。刷新页面可在 10 秒内用浏览器会话令牌恢复位置；房主离开时会转移给下一位玩家。

问答题库是本项目原创的 45 道中英双语题，并非原站的题库。房间和对局记录存放在服务进程内，重启后会清空。当前版本以单进程运行；部署在公网时应使用 HTTPS/WSS，并保持 WebSocket 连接路由到同一进程。

## 测试

```powershell
python -m unittest discover -s tests -v
node --check static/app.js
```

玩法调研与参考链接见 [docs/sameword-research.md](docs/sameword-research.md)。
