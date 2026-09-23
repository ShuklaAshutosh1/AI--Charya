import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const devtoolsPort = Number(process.env.AI_CHARYA_DEVTOOLS_PORT ?? 9223);
const targets = await fetch(`http://127.0.0.1:${devtoolsPort}/json`).then((response) => response.json());
const target = targets.find(
  (entry) => entry.type === "page" && entry.url.startsWith("http://127.0.0.1:4173")
);
if (!target) throw new Error("AI-Charya browser page was not found.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result?.value;
}

async function waitForText(text, timeoutMs = 7000) {
  const started = Date.now();
  let lastBody = "";
  while (Date.now() - started < timeoutMs) {
    lastBody = await evaluate("document.body?.innerText ?? ''");
    if (lastBody.toLowerCase().includes(text.toLowerCase())) return lastBody;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for browser text: ${text}\n${lastBody.slice(0, 1600)}`);
}

async function navigate(path, expectedText) {
  await cdp("Page.navigate", { url: `http://127.0.0.1:4173${path}` });
  return waitForText(expectedText);
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});

await evaluate(`(async () => {
  localStorage.clear();
  const response = await fetch('/api/learners', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name: 'Bhagat', grade: 6})
  });
  const learner = await response.json();
  if (!response.ok) throw new Error(learner.error);
  localStorage.setItem('ai-charya.learner-id', learner.id);
  localStorage.setItem('ai-charya.access-token', learner.accessToken);
  return learner.id;
})()`);

const checkedPages = [];
for (const [subject, title] of [
  ["mathematics", "Fractions foundations"], ["science", "Materials in everyday life"],
  ["english", "Read beyond the sentence"], ["social-science", "Read the world through maps"],
  ["computer-science", "Think like a problem solver"], ["hindi", "पढ़ें, समझें, निष्कर्ष निकालें"]
]) {
  await navigate(`/learn/${subject}`, title);
  const count = await evaluate("document.querySelectorAll('.path-collection__row').length");
  if (count !== 1) throw new Error(`Incorrect subject filtering: ${subject}`);
}
for (const [path, text] of [
  ["/home", "your learning is ready"],
  ["/learn", "What do you want to understand?"],
  ["/challenge", "Put your skills to the test."],
  ["/leaderboard", "Weekly leaderboard"],
  ["/progress", "Your learning, skill by skill"],
  ["/profile", "Your learning profile"]
]) {
  const body = await navigate(path, text);
  if (/\b(Demo|Prototype|Mock|Seeded|Test Data|Local prototype)\b/i.test(body)) {
    throw new Error(`Student-facing development copy found at ${path}.`);
  }
  checkedPages.push(path);
}

await navigate("/home", "your learning is ready");
const screenshot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
const screenshotPath = join(tmpdir(), "ai-charya-home-verified.png");
await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

await navigate("/challenge/1v1", "Find an opponent");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Find an opponent')).click() ");
await waitForText("Practice match ready");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Start challenge')).click() ");
await waitForText("Lock in answer");
await evaluate("document.querySelector('.challenge-options button').click() ");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Lock in answer')).click() ");
await waitForText("Next question");

await navigate("/challenge/rapid-fire", "Join round");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Join round')).click() ");
await waitForText("Practice round ready");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Start Rapid Fire')).click() ");
await waitForText("Submit answer");

await navigate("/goals/math-g6-fractions-foundations", "Begin learning calibration");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Begin learning calibration')).click() ");
await waitForText("Map your starting point");
const sessionShot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
const sessionScreenshotPath = join(tmpdir(), "ai-charya-session-verified.png");
await writeFile(sessionScreenshotPath, Buffer.from(sessionShot.data, "base64"));
await evaluate("document.querySelector('.answer-options button').click() ");
await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Submit response')).click() ");
await waitForText("Continue");

await navigate("/profile", "Learning and accessibility");
await evaluate(`(() => {
  const control = document.querySelector('#preferences input[type="checkbox"]');
  if (!control.checked) control.click();
  [...document.querySelectorAll('#preferences button')].find(button => button.textContent.includes('Save preferences')).click();
})()`);
await waitForText("Preferences saved");
await cdp("Page.reload");
await waitForText("Learning and accessibility");
const preferencePersisted = await evaluate("document.documentElement.classList.contains('reduce-motion')");
if (!preferencePersisted) throw new Error("Saved accessibility preference was not restored.");

await cdp("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
await navigate("/home", "your learning is ready");
if (await evaluate("document.documentElement.scrollWidth > innerWidth + 1")) throw new Error("Home overflows on mobile");
const mobileShot = await cdp("Page.captureScreenshot", {format:"png",captureBeyondViewport:false});
await writeFile(join(tmpdir(),"ai-charya-mobile-verified.png"),Buffer.from(mobileShot.data,"base64"));
await cdp("Emulation.setDeviceMetricsOverride", {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const savedProfile = await evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))");
await evaluate("localStorage.removeItem('ai-charya.learner-id');localStorage.removeItem('ai-charya.access-token')");
await navigate("/", "Learn with");
const landingShot = await cdp("Page.captureScreenshot", {format:"png",captureBeyondViewport:false});
await writeFile(join(tmpdir(),"ai-charya-landing-verified.png"),Buffer.from(landingShot.data,"base64"));
await evaluate(`Object.entries(${savedProfile}).forEach(([key,value])=>localStorage.setItem(key,value))`);
await navigate("/home", "your learning is ready");

socket.close();
if (browserErrors.length) throw new Error(`Browser errors: ${JSON.stringify(browserErrors)}`);
console.log(JSON.stringify({ checkedPages, challengeModes: ["one_v_one", "rapid_fire"], learningResponse: "recorded", preferencePersisted, browserErrors: browserErrors.length, screenshotPath, sessionScreenshotPath }, null, 2));
