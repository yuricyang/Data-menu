let bg;
const FOOD_DATA = [
  {
    file: "pearl.png",
    desc: "polka dot bubble tea, lots of commas"
  },
  {
    file: "gapao chicken.png",
    desc: "Basil, green and red"
  },
  {
    file: "meal in uk.png",
    desc: "egg, chicken, and tomato"
  },
  {
    file: "Sichuan pepper chicken.png",
    desc: "Spicy, runnnn"
  },
  {
    file: "egg.png",
    desc: "gulugulu, tomato taste"
  },
  {
    file: "Vietnam rice paper.png",
    desc: "from a round rice circle, and become whatever you want"
  },
  {
    file: "ginger man biscuit.png",
    desc: "crunchy and spicy, give a bite"
  },
  {
    file: "randomfood123.png",
    desc: "random()"
  },
  {
    file: "salad.png",
    desc: "makes your stomach green"
  },
  {
    file: "stir chicken.png",
    desc: "owwwwwwww"
  },
  {
    file: "stir tofu.png",
    desc: "vegan friendly"
  },
];

// ─── 运行时变量 ───────────────────────────
let autoTokenizer, autoModel, matmul;
let loaded = false;
let statusMsg = "loading";

let foodData = [];   // { desc, img } — 运行时填充
let combined = [];   // 搜索结果

let query = "";
let phase = "loading"; // loading | ready | results

let inputField, searchBtn;

// ─────────────────────────────────────────
function preload() {
  // 预先加载所有图片
  bg = loadImage('background.png');
  for (let item of FOOD_DATA) {
    let entry = { desc: item.desc, img: null };
    loadImage(
      item.file,
      (img) => { entry.img = img; },
      ()    => { console.warn("load failed:" + item.file); }
    );
    foodData.push(entry);
  }
}

// ─────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("'DM Sans'");

  inputField = createInput("", "text");
inputField.size(400);
inputField.attribute("placeholder", "choose your menu here...");
inputField.attribute("disabled", true);
inputField.style("position", "absolute");
inputField.style("top", "700px");        // 距离顶部，放在标题下方
inputField.style("left", "50%");
inputField.style("transform", "translateX(-50%)");  // 水平居中
inputField.style("padding", "10px 20px");
inputField.style("border-radius", "50px");
inputField.style("border", "1px solid #ccc");
inputField.style("font-size", "14px");
inputField.style("font-family", "DM Sans");
inputField.elt.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

searchBtn = createButton("search");
searchBtn.attribute("disabled", true);
searchBtn.style("position", "absolute");
searchBtn.style("top", "700px");
searchBtn.style("left", "calc(50% + 220px)");  // 输入框右边
searchBtn.style("padding", "10px 20px");
searchBtn.style("border-radius", "50px");
searchBtn.style("font-family", "DM Sans");
searchBtn.mousePressed(doSearch);
  // 异步加载模型
  loadTransformers();
}

// ─────────────────────────────────────────
function draw() {
  image(bg, 0, 0, width, height);

  // 标题
  fill(139, 120, 123);
  textSize(25);
  textAlign(LEFT, TOP);
  text("🍜 Data Menu", 20, 18);

  textSize(12);
  fill(120, 90, 60);
  text(statusMsg, 20, height - 18);

  if (phase === "loading") {
    drawLoadingScreen();
  } else if (phase === "ready") {
    drawReadyScreen();
  } else if (phase === "results") {
    drawResults();
  }
}

// ─────────────────────────────────────────
function drawLoadingScreen() {
  let cx = width / 2, cy = height / 2 - 20;
  let t = frameCount * 0.05;
  for (let i = 0; i < 8; i++) {
    let angle = TWO_PI / 8 * i + t;
    let x = cx + cos(angle) * 28;
    let y = cy + sin(angle) * 28;
    let a = map(i, 0, 8, 40, 220);
    fill(255, 160, 60, a);
    noStroke();
    circle(x, y, 7);
  }
  fill(160, 120, 80);
  textSize(13);
  textAlign(CENTER, CENTER);
  text("loading, please wait...", cx, cy + 60);
  textAlign(LEFT, TOP);
}

// ─────────────────────────────────────────
function drawReadyScreen() {
  fill(160, 120, 80);
  textSize(13);
  textAlign(CENTER, CENTER);
  text("type in what you thought now, whatever", width / 2, height / 2);
  textAlign(LEFT, TOP);
}

// ─────────────────────────────────────────
function drawResults() {
  if (combined.length === 0) return;

  let maxSim = combined[0].similarityToQuery;
  let startY = 60;
  let cardH = 88;
  let gap = 10;

  for (let i = 0; i < min(combined.length, 5); i++) {
    let item = combined[i];
    let y = startY + i * (cardH + gap);

    // 卡片背景
    let brightness = map(item.similarityToQuery, 0, maxSim, 0.3, 1.0);
    fill(220 * brightness, 190 * brightness, 195 * brightness,40);
    //stroke(255, 140, 40, 40 + 120 * brightness);
    //strokeWeight(1);
    rect(10, y, width - 20, cardH, 10);
    noStroke();

    // 图片（圆角裁剪）
    if (item.img) {
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.roundRect(18, y + 6, 76, 76, 8);
      drawingContext.clip();
      image(item.img, 18, y + 6, 76, 76);
      drawingContext.restore();
    } else {
      fill(40, 24, 8);
      rect(18, y + 6, 76, 76, 8);
      fill(80);
      textSize(10);
      textAlign(CENTER, CENTER);
      text("no pics", 56, y + 44);
      textAlign(LEFT, TOP);
    }

    // 描述文字
    fill(139, 119, 101);
    textSize(13);
    text(item.desc, 106, y + 14, width - 120, 34);

    // 相似度进度条背景
    let barW = width - 120;
    fill(200, 170, 175, 80);
    rect(106, y + 56, barW, 7, 4);

    // 渐变进度条
    let fillW = barW * (item.similarityToQuery / maxSim);
    let c1 = color(205, 193, 197, 10);
    let c2 = color(139, 130, 134);
    for (let x = 0; x < fillW; x++) {
      let inter = map(x, 0, fillW, 0, 1);
      stroke(lerpColor(c1, c2, inter));
      line(106 + x, y + 56, 106 + x, y + 63);
    }
    noStroke();

    // 百分比
    fill(139, 105, 20);
    textSize(10);
    textAlign(RIGHT, TOP);
    text(int(item.similarityToQuery * 100) + "%", width - 14, y + 70);
    textAlign(LEFT, TOP);

    // 第一名角标
    if (i === 0) {
      fill(139, 105, 20);
      textSize(14);
      textAlign(RIGHT, TOP);
      text("⭐ The best", width - 14, y + 10);
      textAlign(LEFT, TOP);
    }
  }
}

// ─────────────────────────────────────────
async function doSearch() {
  if (!loaded || !inputField.value().trim()) return;

  query = inputField.value().trim();
  statusMsg = "searching...";
  searchBtn.attribute("disabled", true);

  let prefix_q = "task: search result | query: ";
  let prefix_d = "title: none | text: ";

  let allTexts = [prefix_q + query];
  for (let f of foodData) {
    allTexts.push(prefix_d + f.desc);
  }

  let inputs = await autoTokenizer(allTexts, { padding: true, truncation: true });
  let output = await autoModel(inputs);
  let allEmb = output.sentence_embedding;

  let scores = await matmul(allEmb, allEmb.transpose(1, 0));
  let similarities = scores.tolist()[0].slice(1);

  combined = foodData.map((f, i) => ({
    desc: f.desc,
    img: f.img,
    similarityToQuery: similarities[i]
  }));

  combined.sort((a, b) => b.similarityToQuery - a.similarityToQuery);

  phase = "results";
  statusMsg = `✅ "${query}" — find ${combined.length} results`;
  searchBtn.removeAttribute("disabled");
}

// ─────────────────────────────────────────
async function loadTransformers() {
  const transformers = await import(
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers"
  );

  autoTokenizer = await transformers.AutoTokenizer.from_pretrained(
    "onnx-community/embeddinggemma-300m-ONNX"
  );

  autoModel = await transformers.AutoModel.from_pretrained(
    "onnx-community/embeddinggemma-300m-ONNX",
    { device: "wasm", dtype: "fp32" }
  );

  matmul = transformers.matmul;
  loaded = true;

  phase = "ready";
  statusMsg = "✅ model loaded, type in now";

  inputField.removeAttribute("disabled");
  searchBtn.removeAttribute("disabled");
  inputField.elt.focus();
}