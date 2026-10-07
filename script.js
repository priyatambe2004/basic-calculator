const $ = (id) => document.getElementById(id);
const displayEl = $("display");
const expressionEl = $("expression");
const historyList = $("history-list");
const historyEmpty = $("history-empty");

const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const MAX_DIGITS = 15;

/* ---------- Calculator state ---------- */
let current = "0";        // number being typed (kept as a string)
let previous = null;      // first number, saved when an operator is chosen
let operator = null;      // "+", "-", "*" or "/"
let waiting = false;      // true right after pressing an operator
let justEvaluated = false; // true right after pressing equals
let hasError = false;     // true after divide by zero
let history = [];

/* ---------- Arithmetic (no eval) ---------- */
function calculate(a, op, b) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? null : a / b; // null means divide by zero
  return b;
}

// Fixes floating-point noise, so 0.1 + 0.2 shows 0.3 and not 0.30000000000000004
function clean(number) {
  return String(parseFloat(number.toPrecision(12)));
}

/* ---------- Display ---------- */
function render() {
  displayEl.textContent = current;
  displayEl.classList.toggle("error", hasError);

  if (hasError) expressionEl.textContent = "";
  else if (operator && previous !== null) {
    expressionEl.textContent = `${previous} ${SYMBOLS[operator]}${waiting ? "" : " " + current}`;
  }

  document.querySelectorAll(".key.op").forEach((btn) => {
    btn.classList.toggle("active", waiting && btn.dataset.operator === operator);
  });
}

function showError(message) {
  current = message;
  hasError = true;
  previous = null;
  operator = null;
  waiting = false;
  justEvaluated = false;
}

/* ---------- Actions ---------- */
function clearAll() {
  current = "0"; previous = null; operator = null;
  waiting = false; justEvaluated = false; hasError = false;
  expressionEl.textContent = "";
}

function inputNumber(digit) {
  if (hasError) clearAll();
  if (waiting || justEvaluated) {
    current = digit;
    waiting = false;
    justEvaluated = false;
    if (previous === null) expressionEl.textContent = "";
  } else if (current === "0") current = digit;
  else if (current.replace(/[-.]/g, "").length < MAX_DIGITS) current += digit;
}

function inputDecimal() {
  if (hasError) clearAll();
  if (waiting || justEvaluated) {
    current = "0.";
    waiting = false;
    justEvaluated = false;
    return;
  }
  if (!current.includes(".")) current += ".";
}

function chooseOperator(op) {
  if (hasError) return;
  justEvaluated = false;

  // Pressing a second operator in a row just replaces the first one
  if (operator && waiting) { operator = op; return; }

  // Chained calculation: 2 + 3 × ... evaluates 2 + 3 first
  if (operator && previous !== null) {
    const result = calculate(Number(previous), operator, Number(current));
    if (result === null) return showError("Cannot divide by zero");
    previous = clean(result);
    current = previous;
  } else {
    previous = current;
  }
  operator = op;
  waiting = true;
}

function equals() {
  if (hasError || operator === null || previous === null) return;
  const b = waiting ? previous : current; // "5 + =" uses 5 as the second number
  const result = calculate(Number(previous), operator, Number(b));

  if (result === null) return showError("Cannot divide by zero");

  const answer = clean(result);
  const text = `${previous} ${SYMBOLS[operator]} ${b} =`;
  addHistory(text, answer);
  expressionEl.textContent = text;
  current = answer;
  previous = null;
  operator = null;
  waiting = false;
  justEvaluated = true;
}

function percent() {
  if (hasError) return;
  current = clean(Number(current) / 100);
}

function negate() {
  if (hasError || current === "0") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
}

function backspace() {
  if (hasError) return clearAll();
  if (waiting || justEvaluated) return;
  current = current.length > 1 ? current.slice(0, -1) : "0";
  if (current === "-") current = "0";
}

/* ---------- History ---------- */
function addHistory(text, answer) {
  history.unshift({ text, answer });
  history = history.slice(0, 6);
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    const eq = document.createElement("span");
    const res = document.createElement("span");
    eq.className = "eq"; eq.textContent = item.text;
    res.className = "res"; res.textContent = item.answer;
    li.append(eq, res);
    historyList.appendChild(li);
  });
  historyEmpty.hidden = history.length > 0;
}

$("clear-history").addEventListener("click", () => { history = []; renderHistory(); });

/* ---------- Button clicks (one listener for all keys) ---------- */
$("keys").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  if (btn.dataset.number !== undefined) inputNumber(btn.dataset.number);
  else if (btn.dataset.operator) chooseOperator(btn.dataset.operator);
  else {
    const actions = { clear: clearAll, backspace, percent, negate, decimal: inputDecimal, equals };
    actions[btn.dataset.action]();
  }
  render();
});

/* ---------- Keyboard support ---------- */
document.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k >= "0" && k <= "9") inputNumber(k);
  else if (k === ".") inputDecimal();
  else if (["+", "-", "*", "/"].includes(k)) { event.preventDefault(); chooseOperator(k); }
  else if (k === "Enter" || k === "=") { event.preventDefault(); equals(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearAll();
  else if (k === "%") percent();
  else return;
  render();
});

renderHistory();
render();
