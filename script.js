let isAllowGetResponse = false;
const messages = [];
const url = "https://chatanywhere-js.onrender.com/api/ChatAnywhereStream";
//const url = "http://127.0.0.1:3000/api/ChatAnywhereStream";
const prePrompt = [];
const defaultTheme = "dark";

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
const getMessagesHtml = (messages) => {
  return messages
    .map((message, index) => {
      const icon =
        index % 2 === 0
          ? '<i class="bi bi-emoji-sunglasses"></i>'
          : '<i class="bi bi-robot"></i>';
      const promptMsg = index % 2 === 0 ? "message-prompt" : "";
      message = escapeHtml(message);
      const wrappedMessage = index % 2 !== 0 ? wrapCodeTags(message) : message;
      return `<div class="message ${promptMsg}"><div class="message-top">${icon}<i class="bi bi-files"></i></div>${wrappedMessage}</div>`;
    })
    .join("");
};
const wrapCodeTags = (str) => {
  const codeBlockRegex = /```(.+)?\n([\s\S]*?)\n```/gm;
  const codeBlockTemplate =
    '<pre><div class="message-top"><span> $1</span><i class="bi bi-file-earmark-code"></i></div><code>$2</code></pre>';
  return str.replaceAll(codeBlockRegex, codeBlockTemplate);
};
const createMessage = (content, role) => ({ role, content });
const generateMessages = (messages) => {
  return messages.map((message, index) => {
    const role = index % 2 === 0 ? "user" : "assistant";
    return createMessage(message, role);
  });
};
const displayMessages = (messages) => {
  const messageHtml = getMessagesHtml(messages);
  $("#message-container").html(messageHtml);
  setupCopyEvents();
  hljs.highlightAll();
};

const copyEffect = (el) => {
  const copyButton = $(el);
  copyButton.css("color", "#64dd17");
  setTimeout(function () {
    copyButton.css("color", "");
  }, 500);
};

const setupEraseEvent = () => {
  $(".bi-eraser").click(() => {
    if (messages.length % 2 === 0) {
      messages.pop();
      messages.pop();
    } else {
      messages.pop();
    }
    displayMessages(messages);
  });
};
const setupCopyEvents = () => {
  $(".bi-files").click(function () {
    var idx = $(".bi-files").index(this);
    navigator.clipboard.writeText(messages[idx]);
    copyEffect(this);
  });
  $(".bi-file-earmark-code").click(function () {
    var code = $(this).parent().next("code").text();
    navigator.clipboard.writeText(code);
    copyEffect(this);
  });
};
const fetchResponse = async (msgs) => {
  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msgs),
  }).catch((error) => {
    $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
    alert(`Failed to fetch`);
    return;
  });

  let reader = res.body.getReader();
  let result;
  let decoder = new TextDecoder("utf8");
  while (!result?.done) {
    result = await reader.read();
    let chunk = decoder.decode(result.value);
    const arr = chunk.split("\n");
    arr.forEach((data) => {
      if (!isAllowGetResponse) return;
      if (data.length === 0) return;
      if (data.startsWith(":")) return;
      if (data === "data: [DONE]") {
        $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
        return;
      }
      const jsonData = JSON.parse(data.substring(6));
      const delta = jsonData.choices[0].delta;
      if (delta.content != null) {
        messages[messages.length - 1] += delta.content;
      }
      displayMessages(messages);
    });
  }
};
const promptGPT = (messages) => {
  $("#message-input").val("");
  $("#send-button").html("Abort").attr("class", "btn btn-sm btn-warning");
  const msgs = generateMessages(messages);
  isAllowGetResponse = true;
  fetchResponse(msgs);
};

const handleSendButtonClick = (event) => {
  event.preventDefault();
  const buttonAction = $(event.target).html();
  if (buttonAction == "Send") {
    const message = $("#message-input").val();
    messages.push(message, "");
    displayMessages(messages);
    promptGPT(messages);
    clearPrePrompt();
  } else if (buttonAction == "Abort") {
    isAllowGetResponse = false;
    $("#send-button").html("Send").attr("class", "btn btn-sm btn-primary");
  }
};

const getPrePrompt = (
  existingPrompt,
  transToEn,
  transToCn,
  summ,
  optimize,
  grammar
) => {
  const start = "Could you kindly assist me with ";
  const end = `\n\`\`\`\n${existingPrompt}\n\`\`\``;
  switch (true) {
    case optimize && summ:
      return `${start}simplifying and optimizing the code as much as possible? Please use code formatting (\`\`\`language\`\`\`), and provide a summary of the code at the end.${end}`;
    case optimize:
      return `${start}simplifying and optimizing the code as much as possible? Please use code formatting (\`\`\`language\`\`\`).${end}`;
    case grammar:
      return `${start}checking the grammar?${end}`;
    case transToEn && !transToCn && !summ:
      return `${start}translating into English?${end}`;
    case !transToEn && !transToCn && summ:
      return `${start}summarizing?${end}`;
    case transToEn && !transToCn && summ:
      return `${start}summarizing, and translating into English?${end}`;
    case !transToEn && transToCn && !summ:
      return `${start}translating into Chinese?${end}`;
    case !transToEn && transToCn && summ:
      return `${start}summarizing, and translating into Chinese?${end}`;
    default:
      return "";
  }
};

const clearPrePrompt = () => {
  prePrompt.length = 0;
  $(
    "#translate-en-button, #translate-cn-button, #summarize-button, #optimize-button, #grammar-button"
  )
    .data("clicked", false)
    .addClass("btn-link")
    .removeClass("btn-success");
};

const toggleClicked = (button) => {
  const clicked = !button.data("clicked");
  button
    .data("clicked", clicked)
    .toggleClass("btn-link", !clicked)
    .toggleClass("btn-success", clicked);
};

const handleClick = (button1, button2, exclusiveButtons = []) => {
  button2
    ?.data("clicked", false)
    .addClass("btn-link")
    .removeClass("btn-success");
  toggleClicked(button1);
  exclusiveButtons.forEach((btn) => {
    if (btn !== button1.attr("id")) {
      $(`${btn}`)
        .data("clicked", false)
        .addClass("btn-link")
        .removeClass("btn-success");
    }
  });
  handleHotkeyClick();
};

const handleHotkeyClick = () => {
  const buttonIds = [
    "#translate-en-button",
    "#translate-cn-button",
    "#summarize-button",
    "#optimize-button",
    "#grammar-button",
  ];
  const [tEn, tCn, sum, opt, gram] = buttonIds.map(
    (id) => $(id).data("clicked") || false
  );
  const msgInput = $("#message-input");
  if (!prePrompt[0] || prePrompt[0] === "") prePrompt[1] = msgInput.val();
  const newVal = getPrePrompt(prePrompt[1], tEn, tCn, sum, opt, gram);
  prePrompt[0] = newVal;
  msgInput.val(newVal).trigger("change");
  msgInput[0].setSelectionRange(newVal.length - 4, newVal.length - 4);
  msgInput.focus();
};

const toggleTheme = () => {
  var currentTheme = $("html").attr("data-theme");
  var newTheme = currentTheme === "light" ? "dark" : "light";
  $("html").attr("data-theme", newTheme);
  $("#theme-switch").toggleClass("bi-sun bi-moon");
  $("#code-light").prop("disabled", newTheme === "dark");
  $("#code-dark").prop("disabled", newTheme === "light");
  sessionStorage.setItem("theme", newTheme);
};

const loadTheme = () => {
  var theme = sessionStorage.getItem("theme") || defaultTheme;
  if (theme === "light") {
    $("#theme-switch").removeClass("bi-moon").addClass("bi-sun");
  } else {
    $("#theme-switch").removeClass("bi-sun").addClass("bi-moon");
  }
  $("html").attr("data-theme", theme);
  $("#code-light").prop("disabled", theme === "dark");
  $("#code-dark").prop("disabled", theme === "light");
};

$(document).ready(() => {
  loadTheme();
  displayMessages(messages);
  $("#theme-switch").click(toggleTheme);
  $("#send-button").click(handleSendButtonClick);
  $("#translate-en-button").click(() =>
    handleClick($("#translate-en-button"), $("#translate-cn-button"), [
      "#optimize-button",
      "#grammar-button",
    ])
  );
  $("#translate-cn-button").click(() =>
    handleClick($("#translate-cn-button"), $("#translate-en-button"), [
      "#optimize-button",
      "#grammar-button",
    ])
  );
  $("#summarize-button").click(() =>
    handleClick($("#summarize-button"), null, ["#grammar-button"])
  );
  $("#optimize-button").click(() =>
    handleClick($("#optimize-button"), $("#grammar-button"), [
      "#translate-en-button",
      "#translate-cn-button",
    ])
  );
  $("#grammar-button").click(() =>
    handleClick($("#grammar-button"), $("#optimize-button"), [
      "#translate-en-button",
      "#translate-cn-button",
      "#summarize-button",
    ])
  );
  $("#message-input")
    .focus()
    .on("input change", function () {
      const { scrollHeight } = this;
      this.style.height = `${Math.min(scrollHeight, 500)}px`;
      this.style.overflowY = scrollHeight > 500 ? "scroll" : "hidden";
    });
  setupEraseEvent();
});
