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
// 5. To make tapping the widget open Kaizen: fill in KAIZEN_URL below with the
//    exact address you open Kaizen from, then in the widget's edit screen set
//    "When Interacting" to "Open URL" (this replaces tap-to-refresh with tap-to-open
//    — a widget can only do one or the other, not both).
//
// Nothing here talks to the network — it only reads a file already on your device.

const FILE_NAME = "kaizen-widget-data.json";
const KAIZEN_URL = ""; // fill in with the URL you open Kaizen from, e.g. "https://example.com/kaizen.html"

const COLORS = {
  bg: new Color("#fdf6f8"),
  card: new Color("#ffffff"),
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

// left column: the count, the streak dots, the "updated" timestamp
function buildSummaryColumn(container, data){
  const title = container.addText("Kaizen");
  title.font = Font.boldSystemFont(13);
  title.textColor = COLORS.primaryDark;

  container.addSpacer(6);

  const big = container.addText(String(data.tasksLeft));
  big.font = Font.boldSystemFont(30);
  big.textColor = COLORS.ink;

  const label = container.addText(data.tasksLeft === 1 ? "task left" : "tasks left");
  label.font = Font.systemFont(11);
  label.textColor = COLORS.inkDim;

  container.addSpacer(10);

  // matches the app's own strip: today leftmost, oldest (6 days ago) rightmost
  const dotsRow = container.addStack();
  dotsRow.spacing = 4;
  (data.weekDots || []).forEach(pct=>{
    const dot = dotsRow.addStack();
    dot.size = new Size(14, 14);
    dot.cornerRadius = 4;
    dot.backgroundColor = pct > 0 ? COLORS.primary : COLORS.primaryFaint;
  });

  container.addSpacer(8);
  const updated = container.addText("Updated " + timeAgoLabel(data.updatedAt));
  updated.font = Font.systemFont(9);
  updated.textColor = COLORS.inkDim;
}

// right column: as many of today's remaining tasks as comfortably fit
function buildTaskPreviewColumn(container, data, maxRows){
  const remaining = data.remaining || [];

  if(!remaining.length){
    const done = container.addText("All done today ✓");
    done.font = Font.systemFont(13);
    done.textColor = COLORS.primaryDark;
    return;
  }

  const shown = remaining.slice(0, maxRows);
  shown.forEach((name, i)=>{
    const row = container.addStack();
    row.spacing = 6;
    row.centerAlignContent();

    const box = row.addStack();
    box.size = new Size(11, 11);
    box.cornerRadius = 3;
    box.backgroundColor = COLORS.card;
    box.borderWidth = 1.5;
    box.borderColor = COLORS.primaryDark;

    const label = row.addText(name);
    label.font = Font.systemFont(12);
    label.textColor = COLORS.ink;
    label.lineLimit = 1;

    if(i < shown.length - 1) container.addSpacer(5);
  });

  const remainder = remaining.length - shown.length;
  if(remainder > 0){
    container.addSpacer(4);
    const more = container.addText("+" + remainder + " more");
    more.font = Font.systemFont(10);
    more.textColor = COLORS.inkDim;
  }
}

function buildWidget(data){
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.bg;
  widget.setPadding(14, 14, 14, 14);

  if(KAIZEN_URL) widget.url = KAIZEN_URL;

  if(!data){
    const msg = widget.addText("Open Kaizen, tap “Update widget file”, save it to the Scriptable folder.");
    msg.font = Font.systemFont(12);
    msg.textColor = COLORS.inkDim;
    return widget;
  }

  const family = config.widgetFamily || "small";

  if(family === "small"){
    buildSummaryColumn(widget, data);
  } else {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.spacing = 18;

    const left = row.addStack();
    left.layoutVertically();
    left.size = new Size(110, 0); // fixed width, height grows to fit content
    buildSummaryColumn(left, data);

    const right = row.addStack();
    right.layoutVertically();
    buildTaskPreviewColumn(right, data, family === "large" ? 9 : 4);
  }

  return widget;
}

async function run(){
  const data = await loadData();
  const widget = buildWidget(data);
  if(config.runsInWidget){
    Script.setWidget(widget);
  } else if(config.widgetFamily === "large"){
    await widget.presentLarge();
  } else if(config.widgetFamily === "medium"){
    await widget.presentMedium();
  } else {
    await widget.presentSmall();
  }
  Script.complete();
}

await run();
