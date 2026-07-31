// Kaizen widget for the Scriptable app (iOS/iPadOS Home Screen or Today View).
//
// Kaizen itself is a web app and can't share its browser storage with a native
// widget, so this reads a small JSON snapshot file instead: kaizen-widget-data.json.
//
// Setup:
// 1. Install the free "Scriptable" app from the App Store, if you haven't already
//    (this creates a "Scriptable" folder in iCloud Drive automatically).
// 2. In Scriptable, tap + to make a new script, delete the placeholder content, and
//    paste in this whole file. Name it "Kaizen" (or anything you like).
// 3. In Kaizen (in Safari), tap "Update widget file →" at the bottom of Today's
//    tasks, then choose "Save to Files" and save it into iCloud Drive → Scriptable,
//    overwriting the old kaizen-widget-data.json each time you want the widget to
//    reflect today's real numbers — it's a manual refresh, not automatic.
// 4. Long-press your Home Screen (or swipe right to the Today View / "far left"
//    screen) → the + in the corner → search "Scriptable" → pick a size → add it →
//    tap the new widget → set "Script" to the one you just made.
//
// Nothing here talks to the network — it only reads a file already on your device.

const FILE_NAME = "kaizen-widget-data.json";

const COLORS = {
  bg: new Color("#fdf6f8"),
  ink: new Color("#332b30"),
  inkDim: new Color("#9c8d95"),
  primary: new Color("#f2a6c6"),
  primaryFaint: new Color("#f2a6c6", 0.25),
  primaryDark: new Color("#e17ea9")
};

async function loadData(){
  const fm = FileManager.iCloud();
  const dir = fm.documentsDirectory();
  const path = fm.joinPath(dir, FILE_NAME);
  if(!fm.fileExists(path)) return null;
  if(!fm.isFileDownloaded(path)){
    await fm.downloadFileFromiCloud(path);
  }
  try{
    return JSON.parse(fm.readString(path));
  }catch(e){
    return null;
  }
}

function timeAgoLabel(iso){
  if(!iso) return "";
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if(mins < 1) return "just now";
  if(mins < 60) return mins + "m ago";
  const hours = Math.round(mins / 60);
  if(hours < 24) return hours + "h ago";
  return Math.round(hours / 24) + "d ago";
}

function buildWidget(data){
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.bg;
  widget.setPadding(14, 14, 14, 14);

  const title = widget.addText("Kaizen");
  title.font = Font.boldSystemFont(13);
  title.textColor = COLORS.primaryDark;

  widget.addSpacer(6);

  if(!data){
    const msg = widget.addText("Open Kaizen, tap “Update widget file”, save it to the Scriptable folder.");
    msg.font = Font.systemFont(12);
    msg.textColor = COLORS.inkDim;
    return widget;
  }

  const big = widget.addText(String(data.tasksLeft));
  big.font = Font.boldSystemFont(30);
  big.textColor = COLORS.ink;

  const label = widget.addText(data.tasksLeft === 1 ? "task left" : "tasks left");
  label.font = Font.systemFont(11);
  label.textColor = COLORS.inkDim;

  widget.addSpacer(10);

  // matches the app's own strip: today leftmost, oldest (6 days ago) rightmost
  const dotsRow = widget.addStack();
  dotsRow.spacing = 4;
  (data.weekDots || []).forEach(pct=>{
    const dot = dotsRow.addStack();
    dot.size = new Size(16, 16);
    dot.cornerRadius = 5;
    dot.backgroundColor = pct > 0 ? COLORS.primary : COLORS.primaryFaint;
  });

  widget.addSpacer(8);
  const updated = widget.addText("Updated " + timeAgoLabel(data.updatedAt));
  updated.font = Font.systemFont(9);
  updated.textColor = COLORS.inkDim;

  return widget;
}

async function run(){
  const data = await loadData();
  const widget = buildWidget(data);
  if(config.runsInWidget){
    Script.setWidget(widget);
  } else {
    await widget.presentSmall();
  }
  Script.complete();
}

await run();
